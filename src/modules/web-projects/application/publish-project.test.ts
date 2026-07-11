import { describe, expect, it } from "vitest";

import { AppError } from "../../../infrastructure/errors/app-error";
import type {
  StagedProject,
  ValidatedUpload,
  WebProjectAdminSummary,
  WebProjectPublicSummary,
  WebProjectRecord,
  WebProjectVersionRecord,
} from "../domain/web-project";
import type {
  CreateWebProjectInput,
  CreateWebProjectVersionInput,
  WebProjectRepository,
} from "../ports/web-project-repository";
import type { WebProjectStorage } from "../ports/web-project-storage";
import { publishProject } from "./publish-project";
import { rollbackProject } from "./rollback-project";

const NOW = new Date("2026-07-11T12:00:00.000Z");
const LATER = new Date("2026-07-11T12:05:00.000Z");

function upload(checksum: string): ValidatedUpload {
  return {
    kind: "html",
    checksum,
    compressedBytes: 42,
    extractedBytes: 42,
    fileCount: 1,
    entries: [{ normalizedPath: "index.html", bytes: new TextEncoder().encode("<!doctype html>") }],
  };
}

function staged(token: string, checksum: string): StagedProject {
  return {
    prefix: `labs/previews/${token}/`,
    manifestPath: `labs/previews/${token}/manifest.json`,
    checksum,
    fileCount: 1,
    extractedBytes: 42,
    createdAt: NOW,
  };
}

class MemoryStorage implements WebProjectStorage {
  published: string[] = [];
  activated: Array<{ projectSlug: string; versionPrefix: string }> = [];
  removed: string[] = [];
  failPublish = false;

  async stage(token: string): Promise<string> {
    return `labs/previews/${token}/`;
  }

  async publish(stagingPrefix: string, projectSlug: string, version: number): Promise<string> {
    if (this.failPublish) throw new Error("publish failed");

    const prefix = `labs/projects/${projectSlug}/${version}/`;
    this.published.push(`${stagingPrefix}->${prefix}`);
    return prefix;
  }

  async activate(projectSlug: string, versionPrefix: string): Promise<void> {
    this.activated.push({ projectSlug, versionPrefix });
  }

  async remove(prefix: string): Promise<void> {
    this.removed.push(prefix);
  }
}

class MemoryRepository implements WebProjectRepository {
  projects: WebProjectRecord[] = [];
  versions: WebProjectVersionRecord[] = [];
  failSetCurrent = false;
  id = 0;

  async findById(id: string): Promise<WebProjectRecord | null> {
    return this.projects.find((project) => project.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<WebProjectRecord | null> {
    return this.projects.find((project) => project.slug === slug) ?? null;
  }

  async createDraft(input: CreateWebProjectInput): Promise<WebProjectRecord> {
    const project: WebProjectRecord = {
      id: `project-${++this.id}`,
      title: input.title,
      slug: input.slug,
      summary: input.summary ?? "",
      status: "DRAFT",
      stableUrl: null,
      publishedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      currentVersionId: null,
    };
    this.projects.push(project);
    return project;
  }

  async addVersion(input: CreateWebProjectVersionInput): Promise<WebProjectVersionRecord> {
    const version: WebProjectVersionRecord = {
      id: `version-${++this.id}`,
      projectId: input.projectId,
      version: input.version,
      storagePrefix: input.storagePrefix,
      entryPoint: "index.html",
      compressedBytes: input.validation.compressedBytes,
      extractedBytes: input.validation.extractedBytes,
      fileCount: input.validation.fileCount,
      checksum: input.validation.checksum,
      validation: input.validation,
      createdAt: NOW,
      publishedAt: null,
    };
    this.versions.push(version);
    return version;
  }

  async setCurrentVersion(input: {
    projectId: string;
    versionId: string;
    stableUrl: string;
    publishedAt: Date;
  }): Promise<void> {
    if (this.failSetCurrent) throw new Error("metadata failed");

    const project = this.projects.find((item) => item.id === input.projectId);
    const version = this.versions.find((item) => item.id === input.versionId);
    if (!project || !version) throw new Error("missing project/version");

    project.status = "PUBLISHED";
    project.stableUrl = input.stableUrl;
    project.publishedAt = input.publishedAt;
    project.currentVersionId = input.versionId;
    version.publishedAt = input.publishedAt;
  }

  async currentVersion(projectId: string): Promise<WebProjectVersionRecord | null> {
    const project = await this.findById(projectId);
    return this.versions.find((version) => version.id === project?.currentVersionId) ?? null;
  }

  async listVersions(projectId: string): Promise<WebProjectVersionRecord[]> {
    return this.versions
      .filter((version) => version.projectId === projectId)
      .sort((left, right) => right.version - left.version);
  }

  async removeVersion(versionId: string): Promise<void> {
    this.versions = this.versions.filter((version) => version.id !== versionId);
  }

  async listForAdmin(): Promise<WebProjectAdminSummary[]> {
    return [];
  }

  async listPublished(): Promise<WebProjectPublicSummary[]> {
    return [];
  }
}

describe("publishProject", () => {
  it("publishes staged files to a stable labs URL and creates a first version", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();

    const result = await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "Interactive fragment shader notes.",
        staged: staged("preview-token", "checksum-1"),
        validation: upload("checksum-1"),
      },
    );

    expect(result.previewUrl).toBe("https://labs.example.test/previews/preview-token/");
    expect(result.stableUrl).toBe("https://labs.example.test/projects/shader-demo/");
    expect(result.version).toBe(1);
    expect(storage.published).toEqual([
      "labs/previews/preview-token/->labs/projects/shader-demo/1/",
    ]);
    expect(storage.activated).toEqual([
      { projectSlug: "shader-demo", versionPrefix: "labs/projects/shader-demo/1/" },
    ]);
    expect(repository.projects[0]).toMatchObject({
      slug: "shader-demo",
      status: "PUBLISHED",
      stableUrl: "https://labs.example.test/projects/shader-demo/",
      currentVersionId: repository.versions[0].id,
    });
  });

  it("preserves the previous stable version when metadata commit fails", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();
    const first = await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("first", "checksum-1"),
        validation: upload("checksum-1"),
      },
    );

    repository.failSetCurrent = true;

    await expect(
      publishProject(
        { repository, storage, clock: { now: () => LATER }, labsHost: "labs.example.test" },
        {
          projectId: first.projectId,
          title: "Shader Demo",
          slug: "shader-demo",
          summary: "",
          staged: staged("second", "checksum-2"),
          validation: upload("checksum-2"),
        },
      ),
    ).rejects.toThrow("metadata failed");

    expect(storage.activated.at(-1)).toEqual({
      projectSlug: "shader-demo",
      versionPrefix: "labs/projects/shader-demo/1/",
    });
    expect(storage.removed).toContain("labs/projects/shader-demo/2/");
    expect((await repository.currentVersion(first.projectId))?.version).toBe(1);
  });

  it("removes the first publish current pointer when metadata commit fails", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();
    repository.failSetCurrent = true;

    await expect(
      publishProject(
        { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
        {
          title: "Shader Demo",
          slug: "shader-demo",
          summary: "",
          staged: staged("first", "checksum-1"),
          validation: upload("checksum-1"),
        },
      ),
    ).rejects.toThrow("metadata failed");

    expect(storage.removed).toEqual([
      "labs/projects/shader-demo/current",
      "labs/projects/shader-demo/1/",
    ]);
    expect(repository.versions).toEqual([]);
  });

  it("rejects unsafe slugs before publishing to storage", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();

    await expect(
      publishProject(
        { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
        {
          title: "Shader Demo",
          slug: "../evil",
          summary: "",
          staged: staged("first", "checksum-1"),
          validation: upload("checksum-1"),
        },
      ),
    ).rejects.toMatchObject({ code: "WEB_PROJECT_INVALID_SLUG" });

    expect(storage.published).toEqual([]);
    expect(storage.activated).toEqual([]);
  });

  it("keeps only current plus previous published versions after the third publish", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();
    const first = await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("first", "checksum-1"),
        validation: upload("checksum-1"),
      },
    );
    await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        projectId: first.projectId,
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("second", "checksum-2"),
        validation: upload("checksum-2"),
      },
    );
    await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        projectId: first.projectId,
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("third", "checksum-3"),
        validation: upload("checksum-3"),
      },
    );

    expect((await repository.listVersions(first.projectId)).map((version) => version.version)).toEqual([3, 2]);
    expect(storage.removed).toContain("labs/projects/shader-demo/1/");
  });
});

describe("rollbackProject", () => {
  it("activates the previous version without copying uploaded paths", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();
    const first = await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("first", "checksum-1"),
        validation: upload("checksum-1"),
      },
    );
    await publishProject(
      { repository, storage, clock: { now: () => LATER }, labsHost: "labs.example.test" },
      {
        projectId: first.projectId,
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("second", "checksum-2"),
        validation: upload("checksum-2"),
      },
    );

    const result = await rollbackProject(
      { repository, storage, clock: { now: () => LATER }, labsHost: "labs.example.test" },
      first.projectId,
    );

    expect(result.version).toBe(1);
    expect(storage.activated.at(-1)).toEqual({
      projectSlug: "shader-demo",
      versionPrefix: "labs/projects/shader-demo/1/",
    });
    expect((await repository.currentVersion(first.projectId))?.version).toBe(1);
  });

  it("rejects rollback when no previous version exists", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();
    const first = await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("first", "checksum-1"),
        validation: upload("checksum-1"),
      },
    );

    await expect(
      rollbackProject(
        { repository, storage, clock: { now: () => LATER }, labsHost: "labs.example.test" },
        first.projectId,
      ),
    ).rejects.toMatchObject(new AppError("WEB_PROJECT_ROLLBACK_UNAVAILABLE", 409, "No previous version is available."));
  });

  it("reactivates the original current version when rollback metadata commit fails", async () => {
    const repository = new MemoryRepository();
    const storage = new MemoryStorage();
    const first = await publishProject(
      { repository, storage, clock: { now: () => NOW }, labsHost: "labs.example.test" },
      {
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("first", "checksum-1"),
        validation: upload("checksum-1"),
      },
    );
    await publishProject(
      { repository, storage, clock: { now: () => LATER }, labsHost: "labs.example.test" },
      {
        projectId: first.projectId,
        title: "Shader Demo",
        slug: "shader-demo",
        summary: "",
        staged: staged("second", "checksum-2"),
        validation: upload("checksum-2"),
      },
    );
    repository.failSetCurrent = true;

    await expect(
      rollbackProject(
        { repository, storage, clock: { now: () => LATER }, labsHost: "labs.example.test" },
        first.projectId,
      ),
    ).rejects.toThrow("metadata failed");

    expect(storage.activated.slice(-2)).toEqual([
      { projectSlug: "shader-demo", versionPrefix: "labs/projects/shader-demo/1/" },
      { projectSlug: "shader-demo", versionPrefix: "labs/projects/shader-demo/2/" },
    ]);
    expect((await repository.currentVersion(first.projectId))?.version).toBe(2);
  });
});
