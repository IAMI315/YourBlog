export type ArchiveEntryMetadata = {
  path: string;
  compressedBytes: number;
  extractedBytes: number;
  externalFileAttributes: number;
  isDirectory: boolean;
};

export type ArchiveEntry = ArchiveEntryMetadata & {
  read(options?: ArchiveEntryReadOptions): Promise<Uint8Array>;
};

export type ArchiveEntryReadOptions = {
  maxBytes?: number;
};

export class ArchiveEntryReadLimitError extends Error {
  readonly readBytes: number;
  readonly maxBytes: number;

  constructor(readBytes: number, maxBytes: number) {
    super(`Archive entry exceeded the ${maxBytes} byte read limit.`);
    this.name = "ArchiveEntryReadLimitError";
    this.readBytes = readBytes;
    this.maxBytes = maxBytes;
  }
}

export type Archive = {
  entries: ArchiveEntry[];
  close(): Promise<void>;
};

export interface ArchiveReader {
  open(bytes: Uint8Array): Promise<Archive>;
}
