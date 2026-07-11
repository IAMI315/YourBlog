import { AppError } from "../../../infrastructure/errors/app-error";
import type { Clock } from "../../../infrastructure/time/clock";
import type { WebProjectVersionRecord } from "../domain/web-project";
import type { WebProjectRepository } from "../ports/web-project-repository";
import type { WebProjectStorage } from "../ports/web-project-storage";
import { stableProjectUrl } from "./publish-project";

export type RollbackProjectDependencies = {
  repository: WebProjectRepository;
  storage: WebProjectStorage;
  clock?: Clock;
  labsHost: string;
};

export type RollbackProjectResult = {
  projectId: string;
  versionId: string;
  version: number;
  stableUrl: string;
};

export async function rollbackProject(
  { repository, storage, clock = { now: () => new Date() }, labsHost }: RollbackProjectDependencies,
  projectId: string,
): Promise<RollbackProjectResult> {
  const project = await repository.findById(projectId);

  if (!project) {
    throw new AppError("WEB_PROJECT_NOT_FOUND", 404, "The web project could not be found.");
  }

  const current = await repository.currentVersion(projectId);
  const previous = await previousVersion(repository, projectId, current?.id);

  if (!previous) {
    throw new AppError("WEB_PROJECT_ROLLBACK_UNAVAILABLE", 409, "No previous version is available.");
  }

  const stableUrl = stableProjectUrl(labsHost, project.slug);
  await storage.activate(project.slug, previous.storagePrefix);

  try {
    await repository.setCurrentVersion({
      projectId,
      versionId: previous.id,
      stableUrl,
      publishedAt: clock.now(),
    });
  } catch (error) {
    if (current) {
      await storage.activate(project.slug, current.storagePrefix);
    }

    throw error;
  }

  return {
    projectId,
    versionId: previous.id,
    version: previous.version,
    stableUrl,
  };
}

async function previousVersion(
  repository: WebProjectRepository,
  projectId: string,
  currentVersionId?: string,
): Promise<WebProjectVersionRecord | null> {
  const versions = await repository.listVersions(projectId);

  return versions.find((version) => version.id !== currentVersionId) ?? null;
}
