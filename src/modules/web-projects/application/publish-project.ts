import { AppError } from "../../../infrastructure/errors/app-error";
import type { Clock } from "../../../infrastructure/time/clock";
import type { StagedProject, ValidatedUpload, WebProjectRecord } from "../domain/web-project";
import type { WebProjectRepository } from "../ports/web-project-repository";
import type { WebProjectStorage } from "../ports/web-project-storage";

export type PublishProjectInput = {
  projectId?: string;
  title: string;
  slug: string;
  summary: string;
  staged: StagedProject;
  validation: ValidatedUpload;
};

export type PublishProjectResult = {
  projectId: string;
  versionId: string;
  version: number;
  previewUrl: string;
  stableUrl: string;
  versionPrefix: string;
};

export type PublishProjectDependencies = {
  repository: WebProjectRepository;
  storage: WebProjectStorage;
  clock?: Clock;
  labsHost: string;
};

const RETAINED_VERSION_COUNT = 2;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function publishProject(
  { repository, storage, clock = { now: () => new Date() }, labsHost }: PublishProjectDependencies,
  input: PublishProjectInput,
): Promise<PublishProjectResult> {
  const project = await findOrCreateProject(repository, input);
  assertSafeSlug(project.slug);
  const previousVersion = await repository.currentVersion(project.id);
  const nextVersion = await nextVersionNumber(repository, project.id);
  const stableUrl = stableProjectUrl(labsHost, project.slug);
  const previewUrl = previewProjectUrl(labsHost, input.staged.prefix);
  let versionPrefix = "";
  let versionId: string | null = null;

  try {
    versionPrefix = await storage.publish(input.staged.prefix, project.slug, nextVersion);
    await storage.activate(project.slug, versionPrefix);

    const version = await repository.addVersion({
      projectId: project.id,
      version: nextVersion,
      storagePrefix: versionPrefix,
      validation: input.validation,
    });
    versionId = version.id;

    await repository.setCurrentVersion({
      projectId: project.id,
      versionId: version.id,
      stableUrl,
      publishedAt: clock.now(),
    });

    await pruneOldVersions(repository, storage, project.id, new Set([version.id, previousVersion?.id].filter(Boolean)));

    return {
      projectId: project.id,
      versionId: version.id,
      version: version.version,
      previewUrl,
      stableUrl,
      versionPrefix,
    };
  } catch (error) {
    if (previousVersion) {
      await storage.activate(project.slug, previousVersion.storagePrefix);
    } else {
      await storage.remove(currentPointerPrefix(project.slug));
    }

    if (versionId) {
      await repository.removeVersion(versionId);
    }

    if (versionPrefix) {
      await storage.remove(versionPrefix);
    }

    throw error;
  }
}

async function findOrCreateProject(
  repository: WebProjectRepository,
  input: PublishProjectInput,
): Promise<WebProjectRecord> {
  if (input.projectId) {
    const project = await repository.findById(input.projectId);

    if (!project) {
      throw new AppError("WEB_PROJECT_NOT_FOUND", 404, "The web project could not be found.");
    }

    return project;
  }

  const slug = normalizeSlug(input.slug);
  const existing = await repository.findBySlug(slug);

  if (existing) {
    throw new AppError("WEB_PROJECT_SLUG_TAKEN", 409, "A web project already uses this slug.");
  }

  return repository.createDraft({
    title: input.title.trim(),
    slug,
    summary: input.summary.trim(),
  });
}

function normalizeSlug(slug: string): string {
  const normalizedSlug = slug.trim();
  assertSafeSlug(normalizedSlug);

  return normalizedSlug;
}

function assertSafeSlug(slug: string): void {
  if (!SAFE_SLUG.test(slug)) {
    throw new AppError(
      "WEB_PROJECT_INVALID_SLUG",
      400,
      "Use only lowercase letters, numbers, and single hyphens for the project slug.",
    );
  }
}

async function nextVersionNumber(repository: WebProjectRepository, projectId: string): Promise<number> {
  const versions = await repository.listVersions(projectId);
  const latest = versions.reduce((max, version) => Math.max(max, version.version), 0);

  return latest + 1;
}

async function pruneOldVersions(
  repository: WebProjectRepository,
  storage: WebProjectStorage,
  projectId: string,
  retainedIds: Set<string | undefined>,
): Promise<void> {
  const versions = await repository.listVersions(projectId);
  const retained = versions.filter((version) => retainedIds.has(version.id)).slice(0, RETAINED_VERSION_COUNT);
  const retainedSet = new Set(retained.map((version) => version.id));
  const removable = versions.filter((version) => !retainedSet.has(version.id));

  for (const version of removable) {
    await storage.remove(version.storagePrefix);
    await repository.removeVersion(version.id);
  }
}

export function stableProjectUrl(labsHost: string, slug: string): string {
  return `${publicOrigin(labsHost)}/projects/${slug}/`;
}

export function projectPagePath(slug: string): string {
  return `/projects/${slug}/`;
}

function currentPointerPrefix(slug: string): string {
  return `labs/projects/${slug}/current`;
}

export function previewProjectUrl(labsHost: string, stagingPrefix: string): string {
  const match = /^labs\/previews\/([^/]+)\/$/.exec(stagingPrefix);

  if (!match) {
    throw new AppError("WEB_PROJECT_INVALID_PREVIEW_PREFIX", 400, "The preview prefix is invalid.");
  }

  return `${publicOrigin(labsHost)}/previews/${match[1]}/`;
}

function publicOrigin(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");

  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}
