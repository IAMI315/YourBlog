declare module "yauzl-promise" {
  import type { Readable } from "node:stream";

  export type YauzlEntry = {
    filename: string;
    compressedSize: number;
    uncompressedSize: number;
    externalFileAttributes: number;
    openReadStream(): Promise<Readable>;
  };

  export type YauzlZip = AsyncIterable<YauzlEntry> & {
    close(): Promise<void>;
  };

  export function fromBuffer(
    buffer: Buffer,
    options?: {
      decodeStrings?: boolean;
      validateEntrySizes?: boolean;
      validateFilenames?: boolean;
      strictFilenames?: boolean;
      supportMacArchive?: boolean;
    },
  ): Promise<YauzlZip>;
}
