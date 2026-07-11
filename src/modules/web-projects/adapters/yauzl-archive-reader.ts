import { Buffer } from "node:buffer";
import type { Readable } from "node:stream";

import { fromBuffer } from "yauzl-promise";

import {
  ArchiveEntryReadLimitError,
  type Archive,
  type ArchiveEntry,
  type ArchiveReader,
  type ArchiveEntryReadOptions,
} from "../ports/archive-reader";

export class YauzlArchiveReader implements ArchiveReader {
  async open(bytes: Uint8Array): Promise<Archive> {
    const zip = await fromBuffer(Buffer.from(bytes), {
      strictFilenames: false,
      validateEntrySizes: true,
      validateFilenames: false,
      supportMacArchive: false,
    });
    const entries: ArchiveEntry[] = [];

    for await (const entry of zip) {
      entries.push({
        path: entry.filename,
        compressedBytes: entry.compressedSize,
        extractedBytes: entry.uncompressedSize,
        externalFileAttributes: entry.externalFileAttributes,
        isDirectory: entry.filename.endsWith("/"),
        read: async (options) => streamToBytes(await entry.openReadStream(), options),
      });
    }

    return { entries, close: () => zip.close() };
  }
}

async function streamToBytes(
  stream: Readable,
  options: ArchiveEntryReadOptions = {},
): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let readBytes = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    readBytes += buffer.byteLength;

    if (options.maxBytes !== undefined && readBytes > options.maxBytes) {
      stream.destroy(new ArchiveEntryReadLimitError(readBytes, options.maxBytes));
      throw new ArchiveEntryReadLimitError(readBytes, options.maxBytes);
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}
