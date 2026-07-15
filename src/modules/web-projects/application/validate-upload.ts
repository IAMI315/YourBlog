import { createHash } from "node:crypto";

import { AppError } from "../../../infrastructure/errors/app-error";
import type { UploadLimits, ValidatedUpload, WebProjectEntry } from "../domain/web-project";
import { ArchiveEntryReadLimitError, type ArchiveEntry, type ArchiveReader } from "../ports/archive-reader";

export const DEFAULT_WEB_PROJECT_UPLOAD_LIMITS: UploadLimits = {
  compressedBytes: 25 * 1024 * 1024,
  extractedBytes: 100 * 1024 * 1024,
  fileCount: 1_000,
  compressionRatio: 20,
};

export type ValidateUploadInput = {
  bytes: Uint8Array;
  filename: string;
};

export type ValidateUploadDependencies = {
  archiveReader: ArchiveReader;
  limits?: UploadLimits;
};

type NormalizedPath = {
  normalizedPath: string;
  isDirectory: boolean;
};

const WINDOWS_DRIVE_PATH = /^[A-Za-z]:(?:[\\/]|$)/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const UNIX_FILE_TYPE_MASK = 0o170000;
const UNIX_REGULAR_FILE = 0o100000;
const UNIX_DIRECTORY = 0o040000;
const UNSAFE_UNIX_FILE_TYPES = new Set([0o010000, 0o020000, 0o060000, 0o120000, 0o140000]);

export async function validateUpload(
  { archiveReader, limits = DEFAULT_WEB_PROJECT_UPLOAD_LIMITS }: ValidateUploadDependencies,
  input: ValidateUploadInput,
): Promise<ValidatedUpload> {
  assertNonEmptyUpload(input.bytes);
  assertCompressedSize(input.bytes.byteLength, limits);

  if (isZip(input.bytes, input.filename)) {
    return validateZipUpload(archiveReader, limits, input.bytes);
  }

  assertHtmlUpload(input.filename);
  assertExtractedSize(input.bytes.byteLength, limits);
  assertCompressionRatio(input.bytes.byteLength, input.bytes.byteLength, limits);

  return {
    kind: "html",
    checksum: checksum(input.bytes),
    compressedBytes: input.bytes.byteLength,
    extractedBytes: input.bytes.byteLength,
    fileCount: 1,
    entries: [{ normalizedPath: "index.html", bytes: input.bytes }],
  };
}

function assertNonEmptyUpload(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) {
    throw new AppError("WEB_PROJECT_EMPTY_UPLOAD", 400, "The uploaded web project is empty.");
  }
}

function assertCompressedSize(compressedBytes: number, limits: UploadLimits): void {
  if (compressedBytes > limits.compressedBytes) {
    throw new AppError("WEB_PROJECT_COMPRESSED_SIZE_LIMIT", 413, "The web project archive is too large.");
  }
}

function assertHtmlUpload(filename: string): void {
  if (!/\.(?:html|htm)$/i.test(filename)) {
    throw new AppError("WEB_PROJECT_UNSUPPORTED_UPLOAD", 400, "请上传独立 HTML 文件，或 ZIP 压缩项目。");
  }
}

function isZip(bytes: Uint8Array, filename: string): boolean {
  return (
    (bytes.byteLength >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
      (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)) ||
    /\.zip$/i.test(filename)
  );
}

async function validateZipUpload(
  archiveReader: ArchiveReader,
  limits: UploadLimits,
  bytes: Uint8Array,
): Promise<ValidatedUpload> {
  let archive;

  try {
    archive = await archiveReader.open(bytes);
  } catch (error) {
    throw new AppError("WEB_PROJECT_INVALID_ZIP", 400, "The ZIP archive could not be read.", { cause: error });
  }

  try {
    const metadata = validateZipMetadata(archive.entries, limits, bytes.byteLength);
    const entries: WebProjectEntry[] = [];
    const actualReadLimit = actualExtractedReadLimit(limits, bytes.byteLength);
    let actualExtractedBytes = 0;

    for (const entry of metadata.fileEntries) {
      const remainingBytes = actualReadLimit - actualExtractedBytes;
      let entryBytes: Uint8Array;

      try {
        entryBytes = await entry.archiveEntry.read({ maxBytes: Math.max(remainingBytes, 0) });
      } catch (error) {
        if (error instanceof ArchiveEntryReadLimitError) {
          throw actualReadLimitError(actualExtractedBytes + error.readBytes, limits);
        }

        throw error;
      }

      actualExtractedBytes += entryBytes.byteLength;
      assertExtractedSize(actualExtractedBytes, limits);
      assertCompressionRatio(actualExtractedBytes, bytes.byteLength, limits);
      entries.push({ normalizedPath: entry.normalizedPath, bytes: entryBytes });
    }

    return {
      kind: "zip",
      checksum: checksum(bytes),
      compressedBytes: bytes.byteLength,
      extractedBytes: actualExtractedBytes,
      fileCount: entries.length,
      entries,
    };
  } finally {
    await archive.close();
  }
}

function validateZipMetadata(entries: ArchiveEntry[], limits: UploadLimits, archiveBytes: number): {
  fileEntries: Array<{ archiveEntry: ArchiveEntry; normalizedPath: string }>;
} {
  const normalizedPaths = new Set<string>();
  const fileEntries: Array<{ archiveEntry: ArchiveEntry; normalizedPath: string }> = [];
  let extractedBytes = 0;

  for (const entry of entries) {
    assertSafeUnixFileType(entry);

    const { normalizedPath, isDirectory } = normalizeArchivePath(entry.path, entry.isDirectory);
    if (isDirectory) continue;

    if (normalizedPaths.has(normalizedPath)) {
      throw new AppError("WEB_PROJECT_DUPLICATE_PATH", 400, "The ZIP archive contains duplicate file paths.");
    }

    normalizedPaths.add(normalizedPath);
    fileEntries.push({ archiveEntry: entry, normalizedPath });

    if (fileEntries.length > limits.fileCount) {
      throw new AppError("WEB_PROJECT_FILE_COUNT_LIMIT", 413, "The ZIP archive contains too many files.");
    }

    extractedBytes += entry.extractedBytes;
    assertExtractedSize(extractedBytes, limits);
    assertCompressionRatio(extractedBytes, archiveBytes, limits);
  }

  if (!normalizedPaths.has("index.html")) {
    throw new AppError("WEB_PROJECT_MISSING_INDEX", 400, "The ZIP archive must contain a root index.html file.");
  }

  return { fileEntries };
}

export function normalizeArchivePath(path: string, isDirectory = false): NormalizedPath {
  if (path.length === 0 || CONTROL_CHARACTERS.test(path)) {
    throw new AppError("WEB_PROJECT_UNSAFE_PATH", 400, "The ZIP archive contains an unsafe file path.");
  }

  if (WINDOWS_DRIVE_PATH.test(path)) {
    throw new AppError("WEB_PROJECT_UNSAFE_PATH", 400, "The ZIP archive contains an unsafe file path.");
  }

  const normalized = path.replaceAll("\\", "/");

  if (normalized.startsWith("/")) {
    throw new AppError("WEB_PROJECT_UNSAFE_PATH", 400, "The ZIP archive contains an unsafe file path.");
  }

  const directoryPath = isDirectory && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;

  for (const segment of directoryPath.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new AppError("WEB_PROJECT_UNSAFE_PATH", 400, "The ZIP archive contains an unsafe file path.");
    }
  }

  return { normalizedPath: directoryPath, isDirectory };
}

function assertSafeUnixFileType(entry: ArchiveEntry): void {
  const unixMode = entry.externalFileAttributes >>> 16;
  const fileType = unixMode & UNIX_FILE_TYPE_MASK;

  if (fileType === 0) return;

  if (UNSAFE_UNIX_FILE_TYPES.has(fileType) || (fileType !== UNIX_REGULAR_FILE && fileType !== UNIX_DIRECTORY)) {
    throw new AppError("WEB_PROJECT_UNSAFE_FILE_TYPE", 400, "The ZIP archive contains an unsafe file type.");
  }
}

function assertExtractedSize(extractedBytes: number, limits: UploadLimits): void {
  if (extractedBytes > limits.extractedBytes) {
    throw new AppError("WEB_PROJECT_EXTRACTED_SIZE_LIMIT", 413, "The ZIP archive expands to too much data.");
  }
}

function assertCompressionRatio(extractedBytes: number, compressedBytes: number, limits: UploadLimits): void {
  if (compressedBytes > 0 && extractedBytes / compressedBytes > limits.compressionRatio) {
    throw new AppError("WEB_PROJECT_COMPRESSION_RATIO_LIMIT", 413, "The ZIP archive is too highly compressed.");
  }
}

function actualExtractedReadLimit(limits: UploadLimits, compressedBytes: number): number {
  if (compressedBytes <= 0) return limits.extractedBytes;

  return Math.min(limits.extractedBytes, Math.floor(limits.compressionRatio * compressedBytes));
}

function actualReadLimitError(actualExtractedBytes: number, limits: UploadLimits): AppError {
  if (actualExtractedBytes > limits.extractedBytes) {
    return new AppError("WEB_PROJECT_EXTRACTED_SIZE_LIMIT", 413, "The ZIP archive expands to too much data.");
  }

  return new AppError("WEB_PROJECT_COMPRESSION_RATIO_LIMIT", 413, "The ZIP archive is too highly compressed.");
}

function checksum(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
