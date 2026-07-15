import "server-only";

import { prisma } from "../../infrastructure/db/prisma";
import { publishProject as publishProjectWithDependencies } from "./application/publish-project";
import { rollbackProject as rollbackProjectWithDependencies } from "./application/rollback-project";
import { stageUpload as stageUploadWithDependencies } from "./application/stage-upload";
import {
  createStagedUploadTicket as createStagedUploadTicketWithSecret,
  verifyStagedUploadTicket as verifyStagedUploadTicketWithSecret,
} from "./application/staged-upload-ticket";
import { validateUpload as validateUploadWithDependencies } from "./application/validate-upload";
import { LocalWebProjectStorage } from "./adapters/local-web-project-storage";
import { PrismaWebProjectRepository } from "./adapters/prisma-web-project-repository";
import {
  projectPagePath,
  type PublishProjectInput,
} from "./application/publish-project";
import type { UploadLimits, ValidatedUpload } from "./domain/web-project";
import type { ArchiveReader } from "./ports/archive-reader";

const repository = new PrismaWebProjectRepository(prisma);
const storage = new LocalWebProjectStorage();
const clock = { now: () => new Date() };
let archiveReader: ArchiveReader | null = null;

function labsHost(): string {
  return process.env.LABS_HOST ?? "localhost:3001";
}

function uploadTicketSecret(): string {
  return process.env.WEB_PROJECT_UPLOAD_SECRET ?? process.env.AUTH_SECRET ?? "development-upload-secret";
}

async function getArchiveReader(): Promise<ArchiveReader> {
  if (!archiveReader) {
    const { YauzlArchiveReader } = await import("./adapters/yauzl-archive-reader");
    archiveReader = new YauzlArchiveReader();
  }

  return archiveReader;
}

export async function validateUpload(input: { bytes: Uint8Array; filename: string; limits?: UploadLimits }) {
  return validateUploadWithDependencies(
    { archiveReader: await getArchiveReader(), limits: input.limits },
    { bytes: input.bytes, filename: input.filename },
  );
}

export function stageUpload(upload: ValidatedUpload) {
  return stageUploadWithDependencies({ storage, clock }, upload);
}

export async function validateAndStageUpload(input: {
  bytes: Uint8Array;
  filename: string;
  limits?: UploadLimits;
}) {
  const validated = await validateUpload(input);
  const staged = await stageUpload(validated);
  const token = staged.prefix.match(/^labs\/previews\/([^/]+)\/$/)?.[1] ?? "";

  return {
    validated,
    staged,
    previewUrl: `https://${labsHost()}/previews/${token}/`,
    ticket: createStagedUploadTicketWithSecret(uploadTicketSecret(), { staged, validated }),
  };
}

export function verifyStagedUploadTicket(ticket: string) {
  return verifyStagedUploadTicketWithSecret(uploadTicketSecret(), ticket);
}

export function publishProject(input: PublishProjectInput) {
  return publishProjectWithDependencies({ repository, storage, clock, labsHost: labsHost() }, input);
}

export function rollbackProject(projectId: string) {
  return rollbackProjectWithDependencies({ repository, storage, clock, labsHost: labsHost() }, projectId);
}

export function listWebProjectsForAdmin() {
  return repository.listForAdmin();
}

export function listPublishedWebProjects() {
  return repository.listPublished();
}

export function findWebProjectForAdmin(id: string) {
  return repository.findById(id);
}

export function listWebProjectVersions(projectId: string) {
  return repository.listVersions(projectId);
}

export { projectPagePath };

export type {
  StagedProject,
  UploadLimits,
  ValidatedUpload,
  WebProjectAdminSummary,
  WebProjectEntry,
  WebProjectPublicSummary,
  WebProjectRecord,
  WebProjectVersionRecord,
} from "./domain/web-project";
export type { PublishProjectInput, PublishProjectResult } from "./application/publish-project";
export type { RollbackProjectResult } from "./application/rollback-project";
export type { WebProjectRepository } from "./ports/web-project-repository";
export type { WebProjectStorage } from "./ports/web-project-storage";
