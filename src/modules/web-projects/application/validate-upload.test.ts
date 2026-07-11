import { describe, expect, it, vi } from "vitest";
import { ZipFile } from "yazl";

import type { UploadLimits, ValidatedUpload } from "../domain/web-project";
import {
  ArchiveEntryReadLimitError,
  type Archive,
  type ArchiveEntry,
  type ArchiveEntryReadOptions,
  type ArchiveReader,
} from "../ports/archive-reader";
import type { WebProjectStorage } from "../ports/web-project-storage";
import { YauzlArchiveReader } from "../adapters/yauzl-archive-reader";
import { stageUpload } from "./stage-upload";
import { DEFAULT_WEB_PROJECT_UPLOAD_LIMITS, validateUpload } from "./validate-upload";

const NOW = new Date("2026-07-11T10:00:00.000Z");
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const archiveReader = new YauzlArchiveReader();
const TEST_LIMITS: UploadLimits = {
  ...DEFAULT_WEB_PROJECT_UPLOAD_LIMITS,
  compressedBytes: 1024 * 1024,
  extractedBytes: 1024 * 1024,
  fileCount: 20,
  compressionRatio: 100,
};

type ZipFixtureEntry = {
  path: string;
  content?: string | Uint8Array;
  mode?: number;
  compress?: boolean;
};

class MemoryWebProjectStorage implements WebProjectStorage {
  writes = new Map<string, Uint8Array>();
  removed: string[] = [];
  failStage = false;

  async stage(token: string, entries: ValidatedUpload["entries"]): Promise<string> {
    const prefix = `labs/previews/${token}/`;

    if (this.failStage) {
      this.writes.set(`${prefix}partial.txt`, textEncoder.encode("partial"));
      throw new Error("stage failed");
    }

    for (const entry of entries) {
      this.writes.set(`${prefix}${entry.normalizedPath}`, entry.bytes);
    }

    return prefix;
  }

  async publish(stagingPrefix: string): Promise<string> {
    return stagingPrefix.replace("previews", "projects");
  }

  async activate(): Promise<void> {}

  async remove(prefix: string): Promise<void> {
    this.removed.push(prefix);

    for (const key of Array.from(this.writes.keys())) {
      if (key.startsWith(prefix)) this.writes.delete(key);
    }
  }
}

class FakeArchiveReader implements ArchiveReader {
  entryRead = vi.fn();

  constructor(private readonly entries: ArchiveEntry[]) {}

  async open(): Promise<Archive> {
    return {
      entries: this.entries.map((entry) => ({
        ...entry,
        read: async () => {
          this.entryRead(entry.path);
          return entry.read();
        },
      })),
      close: async () => {},
    };
  }
}

function bytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

function validateZip(zipBytes: Uint8Array, limits = TEST_LIMITS): Promise<ValidatedUpload> {
  return validateUpload({ archiveReader, limits }, { bytes: zipBytes, filename: "project.zip" });
}

async function createZip(entries: ZipFixtureEntry[]): Promise<Uint8Array> {
  const zip = new ZipFile();

  for (const entry of entries) {
    zip.addBuffer(Buffer.from(entry.content ?? "<!doctype html>"), entry.path, {
      mode: entry.mode,
      compress: entry.compress,
    });
  }

  zip.end();

  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function createZipWithPatchedPath(path: string): Promise<Uint8Array> {
  const target = Buffer.from(path);
  const placeholder = "safe-" + "x".repeat(target.byteLength - 5);
  const placeholderBytes = Buffer.from(placeholder);
  const zip = Buffer.from(await createZip([{ path: placeholder, content: "bad" }]));
  let replacements = 0;

  for (let offset = zip.indexOf(placeholderBytes); offset !== -1; offset = zip.indexOf(placeholderBytes, offset + 1)) {
    target.copy(zip, offset);
    replacements += 1;
  }

  if (replacements < 2) {
    throw new Error(`Expected to patch local and central ZIP paths for ${path}`);
  }

  return zip;
}

function fakeEntry(input: Partial<ArchiveEntry> & Pick<ArchiveEntry, "path">): ArchiveEntry {
  const content = input.read ? undefined : bytes("x");
  const read =
    input.read ??
    (async (options?: ArchiveEntryReadOptions) => {
      const entryBytes = content ?? bytes("x");

      if (options?.maxBytes !== undefined && entryBytes.byteLength > options.maxBytes) {
        throw new ArchiveEntryReadLimitError(entryBytes.byteLength, options.maxBytes);
      }

      return entryBytes;
    });

  return {
    compressedBytes: content?.byteLength ?? 1,
    extractedBytes: content?.byteLength ?? 1,
    externalFileAttributes: 0,
    isDirectory: false,
    ...input,
    read,
  };
}

describe("validateUpload", () => {
  it("converts a standalone HTML upload to index.html", async () => {
    const html = bytes("<!doctype html><h1>Demo</h1>");
    const result = await validateUpload(
      { archiveReader, limits: TEST_LIMITS },
      { bytes: html, filename: "demo.HTML" },
    );

    expect(result.kind).toBe("html");
    expect(result.fileCount).toBe(1);
    expect(result.extractedBytes).toBe(html.byteLength);
    expect(result.entries).toEqual([{ normalizedPath: "index.html", bytes: html }]);
  });

  it.each(["../escape.html", "/absolute.html", "C:\\escape.html"])(
    "rejects unsafe ZIP path %s",
    async (unsafePath) => {
      await expect(validateZip(await createZipWithPatchedPath(unsafePath))).rejects.toMatchObject({
        code: "WEB_PROJECT_UNSAFE_PATH",
      });
    },
  );

  it.each(["assets//bad.css", "./index.html", "bad\u0000name.html"])(
    "rejects malformed ZIP path %s",
    async (unsafePath) => {
      await expect(
        validateZip(
          await createZip([
            { path: "index.html", content: "<!doctype html>" },
            { path: unsafePath, content: "bad" },
          ]),
        ),
      ).rejects.toMatchObject({ code: "WEB_PROJECT_UNSAFE_PATH" });
    },
  );

  it("rejects parent-directory path segments", async () => {
    await expect(validateZip(await createZipWithPatchedPath("assets/../index.html"))).rejects.toMatchObject({
      code: "WEB_PROJECT_UNSAFE_PATH",
    });
  });

  it("rejects duplicate normalized paths", async () => {
    await expect(
      validateZip(
        await createZip([
          { path: "index.html", content: "<!doctype html>" },
          { path: "assets/app.css", content: "body{}" },
          { path: "assets\\app.css", content: "html{}" },
        ]),
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_DUPLICATE_PATH" });
  });

  it("rejects symbolic-link mode bits", async () => {
    await expect(
      validateZip(
        await createZip([
          { path: "index.html", content: "<!doctype html>" },
          { path: "linked.html", content: "target", mode: 0o120777 },
        ]),
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_UNSAFE_FILE_TYPE" });
  });

  it.each([
    ["FIFO", 0o010644],
    ["character device", 0o020644],
    ["block device", 0o060644],
    ["socket", 0o140644],
  ])("rejects %s mode bits", async (_name, mode) => {
    await expect(
      validateZip(
        await createZip([
          { path: "index.html", content: "<!doctype html>" },
          { path: "special.bin", content: "unsafe", mode },
        ]),
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_UNSAFE_FILE_TYPE" });
  });

  it("rejects a ZIP without a root index.html", async () => {
    await expect(
      validateZip(
        await createZip([
          { path: "nested/index.html", content: "<!doctype html>" },
          { path: "assets/app.css", content: "body{}" },
        ]),
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_MISSING_INDEX" });
  });

  it("rejects too many files before reading entry data", async () => {
    const fakeReader = new FakeArchiveReader([
      fakeEntry({ path: "index.html" }),
      fakeEntry({ path: "one.css" }),
      fakeEntry({ path: "two.css" }),
    ]);

    await expect(
      validateUpload(
        { archiveReader: fakeReader, limits: { ...TEST_LIMITS, fileCount: 2 } },
        { bytes: bytes("PK\x03\x04fake"), filename: "project.zip" },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_FILE_COUNT_LIMIT" });
    expect(fakeReader.entryRead).not.toHaveBeenCalled();
  });

  it("rejects extracted-size overflow before reading entry data", async () => {
    const fakeReader = new FakeArchiveReader([
      fakeEntry({ path: "index.html", compressedBytes: 1, extractedBytes: 10 }),
    ]);

    await expect(
      validateUpload(
        { archiveReader: fakeReader, limits: { ...TEST_LIMITS, extractedBytes: 9 } },
        { bytes: bytes("PK\x03\x04fake"), filename: "project.zip" },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_EXTRACTED_SIZE_LIMIT" });
    expect(fakeReader.entryRead).not.toHaveBeenCalled();
  });

  it("rejects compression-ratio overflow before reading entry data", async () => {
    const fakeReader = new FakeArchiveReader([
      fakeEntry({ path: "index.html", compressedBytes: 1, extractedBytes: 10_000 }),
    ]);

    await expect(
      validateUpload(
        { archiveReader: fakeReader, limits: { ...TEST_LIMITS, extractedBytes: 20_000, compressionRatio: 100 } },
        { bytes: bytes("PK\x03\x04fake"), filename: "project.zip" },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_COMPRESSION_RATIO_LIMIT" });
    expect(fakeReader.entryRead).not.toHaveBeenCalled();
  });

  it("rejects actual compression-ratio overflow after reading entry data", async () => {
    const fakeReader = new FakeArchiveReader([
      fakeEntry({
        path: "index.html",
        compressedBytes: 1,
        extractedBytes: 1,
        read: async (options?: ArchiveEntryReadOptions) => {
          const entryBytes = bytes("x".repeat(500));

          if (options?.maxBytes !== undefined && entryBytes.byteLength > options.maxBytes) {
            throw new ArchiveEntryReadLimitError(entryBytes.byteLength, options.maxBytes);
          }

          return entryBytes;
        },
      }),
    ]);

    await expect(
      validateUpload(
        { archiveReader: fakeReader, limits: { ...TEST_LIMITS, extractedBytes: 1_000, compressionRatio: 10 } },
        { bytes: bytes("PK\x03\x04fake"), filename: "project.zip" },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_COMPRESSION_RATIO_LIMIT" });
    expect(fakeReader.entryRead).toHaveBeenCalledWith("index.html");
  });

  it("rejects actual extracted-size overflow while reading entry data", async () => {
    const fakeReader = new FakeArchiveReader([
      fakeEntry({
        path: "index.html",
        compressedBytes: 1,
        extractedBytes: 1,
        read: async (options?: ArchiveEntryReadOptions) => {
          const entryBytes = bytes("x".repeat(100));

          if (options?.maxBytes !== undefined && entryBytes.byteLength > options.maxBytes) {
            throw new ArchiveEntryReadLimitError(entryBytes.byteLength, options.maxBytes);
          }

          return entryBytes;
        },
      }),
    ]);

    await expect(
      validateUpload(
        { archiveReader: fakeReader, limits: { ...TEST_LIMITS, extractedBytes: 10, compressionRatio: 1_000 } },
        { bytes: bytes("PK\x03\x04fake"), filename: "project.zip" },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_EXTRACTED_SIZE_LIMIT" });
    expect(fakeReader.entryRead).toHaveBeenCalledWith("index.html");
  });

  it("accepts Chinese asset names and nested CSS/image paths", async () => {
    const result = await validateZip(
      await createZip([
        { path: "index.html", content: '<link rel="stylesheet" href="样式/主题.css"><img src="图片/图标.png">' },
        { path: "样式/主题.css", content: "body{color:red}" },
        { path: "图片/图标.png", content: Uint8Array.of(137, 80, 78, 71) },
      ]),
    );

    expect(result.kind).toBe("zip");
    expect(result.entries.map((entry) => entry.normalizedPath)).toEqual([
      "index.html",
      "样式/主题.css",
      "图片/图标.png",
    ]);
  });

  it("rejects compressed ZIP bytes over the configured limit", async () => {
    await expect(
      validateUpload(
        { archiveReader, limits: { ...TEST_LIMITS, compressedBytes: 3 } },
        { bytes: await createZip([{ path: "index.html" }]), filename: "project.zip" },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_COMPRESSED_SIZE_LIMIT" });
  });
});

describe("stageUpload", () => {
  it("stages validated entries and writes a manifest under a preview token", async () => {
    const storage = new MemoryWebProjectStorage();
    const upload = await validateUpload(
      { archiveReader, limits: TEST_LIMITS },
      { bytes: bytes("<!doctype html>"), filename: "demo.html" },
    );

    const staged = await stageUpload(
      { storage, clock: { now: () => NOW }, tokenFactory: () => "preview-token" },
      upload,
    );

    expect(staged.prefix).toBe("labs/previews/preview-token/");
    expect(storage.writes.has("labs/previews/preview-token/index.html")).toBe(true);
    const manifest = JSON.parse(textDecoder.decode(storage.writes.get("labs/previews/preview-token/manifest.json")!));
    expect(manifest).toEqual({
      checksum: upload.checksum,
      fileCount: 1,
      extractedBytes: upload.extractedBytes,
      createdAt: NOW.toISOString(),
    });
  });

  it("removes the whole staging prefix when a write fails", async () => {
    const storage = new MemoryWebProjectStorage();
    storage.failStage = true;
    const upload = await validateUpload(
      { archiveReader, limits: TEST_LIMITS },
      { bytes: bytes("<!doctype html>"), filename: "demo.html" },
    );

    await expect(stageUpload({ storage, tokenFactory: () => "failing-token" }, upload)).rejects.toThrow(
      "stage failed",
    );

    expect(storage.removed).toEqual(["labs/previews/failing-token/"]);
    expect(Array.from(storage.writes.keys())).toEqual([]);
  });
});
