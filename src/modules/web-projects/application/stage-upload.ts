import { TextEncoder } from "node:util";

import { nanoid } from "nanoid";

import type { Clock } from "../../../infrastructure/time/clock";
import type { StagedProject, ValidatedUpload, WebProjectEntry } from "../domain/web-project";
import type { WebProjectStorage } from "../ports/web-project-storage";

export type StageUploadDependencies = {
  storage: WebProjectStorage;
  clock?: Clock;
  tokenFactory?: () => string;
};

type Manifest = {
  checksum: string;
  fileCount: number;
  extractedBytes: number;
  createdAt: string;
};

export async function stageUpload(
  { storage, clock = { now: () => new Date() }, tokenFactory = nanoid }: StageUploadDependencies,
  upload: ValidatedUpload,
): Promise<StagedProject> {
  const token = tokenFactory();
  const createdAt = clock.now();
  const manifestPath = "manifest.json";
  const entries: WebProjectEntry[] = [
    ...upload.entries,
    {
      normalizedPath: manifestPath,
      bytes: new TextEncoder().encode(JSON.stringify(toManifest(upload, createdAt), null, 2)),
    },
  ];
  let prefix = `labs/previews/${token}/`;

  try {
    prefix = await storage.stage(token, entries);

    return {
      prefix,
      manifestPath: `${prefix}${manifestPath}`,
      checksum: upload.checksum,
      fileCount: upload.fileCount,
      extractedBytes: upload.extractedBytes,
      createdAt,
    };
  } catch (error) {
    await storage.remove(prefix);
    throw error;
  }
}

function toManifest(upload: ValidatedUpload, createdAt: Date): Manifest {
  return {
    checksum: upload.checksum,
    fileCount: upload.fileCount,
    extractedBytes: upload.extractedBytes,
    createdAt: createdAt.toISOString(),
  };
}
