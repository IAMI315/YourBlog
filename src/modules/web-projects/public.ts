import "server-only";

export { stageUpload } from "./application/stage-upload";
import { validateUpload as validateUploadWithDependencies } from "./application/validate-upload";
import { YauzlArchiveReader } from "./adapters/yauzl-archive-reader";
import type { UploadLimits } from "./domain/web-project";

const archiveReader = new YauzlArchiveReader();

export function validateUpload(input: { bytes: Uint8Array; filename: string; limits?: UploadLimits }) {
  return validateUploadWithDependencies(
    { archiveReader, limits: input.limits },
    { bytes: input.bytes, filename: input.filename },
  );
}

export type { StagedProject, UploadLimits, ValidatedUpload, WebProjectEntry } from "./domain/web-project";
export type { WebProjectRepository } from "./ports/web-project-repository";
export type { WebProjectStorage } from "./ports/web-project-storage";
