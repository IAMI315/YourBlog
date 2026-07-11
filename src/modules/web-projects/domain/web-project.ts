export type UploadKind = "html" | "zip";

export type UploadLimits = {
  compressedBytes: number;
  extractedBytes: number;
  fileCount: number;
  compressionRatio: number;
};

export type WebProjectEntry = {
  normalizedPath: string;
  bytes: Uint8Array;
};

export type ValidatedUpload = {
  kind: UploadKind;
  checksum: string;
  compressedBytes: number;
  extractedBytes: number;
  fileCount: number;
  entries: WebProjectEntry[];
};

export type StagedProject = {
  prefix: string;
  manifestPath: string;
  checksum: string;
  fileCount: number;
  extractedBytes: number;
  createdAt: Date;
};

export type WebProjectRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: "DRAFT" | "PUBLISHED";
  stableUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WebProjectVersionRecord = {
  id: string;
  projectId: string;
  version: number;
  storagePrefix: string;
  entryPoint: "index.html";
  compressedBytes: number;
  extractedBytes: number;
  fileCount: number;
  checksum: string;
  validation: unknown;
  createdAt: Date;
  publishedAt: Date | null;
};
