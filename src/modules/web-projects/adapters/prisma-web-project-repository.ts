import type { PrismaClient } from "../../../generated/prisma/client";
import type {
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

type PrismaWebProjectRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: "DRAFT" | "PUBLISHED";
  stableUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currentVersionId: string | null;
  currentVersion?: { version: number } | null;
};

type PrismaWebProjectVersionRow = {
  id: string;
  projectId: string;
  version: number;
  storagePrefix: string;
  entryPoint: string;
  compressedBytes: bigint | number;
  extractedBytes: bigint | number;
  fileCount: number;
  checksum: string;
  validation: unknown;
  createdAt: Date;
  publishedAt: Date | null;
};

function toProject(row: PrismaWebProjectRow): WebProjectRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    status: row.status,
    stableUrl: row.stableUrl,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    currentVersionId: row.currentVersionId,
  };
}

function toVersion(row: PrismaWebProjectVersionRow): WebProjectVersionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    version: row.version,
    storagePrefix: row.storagePrefix,
    entryPoint: "index.html",
    compressedBytes: Number(row.compressedBytes),
    extractedBytes: Number(row.extractedBytes),
    fileCount: row.fileCount,
    checksum: row.checksum,
    validation: row.validation,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}

function toJson(value: unknown) {
  return value as never;
}

export class PrismaWebProjectRepository implements WebProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<WebProjectRecord | null> {
    const project = await this.prisma.webProject.findUnique({ where: { id } });

    return project ? toProject(project) : null;
  }

  async findBySlug(slug: string): Promise<WebProjectRecord | null> {
    const project = await this.prisma.webProject.findUnique({ where: { slug } });

    return project ? toProject(project) : null;
  }

  async createDraft(input: CreateWebProjectInput): Promise<WebProjectRecord> {
    const project = await this.prisma.webProject.create({
      data: {
        title: input.title,
        slug: input.slug,
        summary: input.summary ?? "",
      },
    });

    return toProject(project);
  }

  async addVersion(input: CreateWebProjectVersionInput): Promise<WebProjectVersionRecord> {
    const version = await this.prisma.webProjectVersion.create({
      data: {
        projectId: input.projectId,
        version: input.version,
        storagePrefix: input.storagePrefix,
        entryPoint: "index.html",
        compressedBytes: BigInt(input.validation.compressedBytes),
        extractedBytes: BigInt(input.validation.extractedBytes),
        fileCount: input.validation.fileCount,
        checksum: input.validation.checksum,
        validation: toJson({
          kind: input.validation.kind,
          checksum: input.validation.checksum,
          compressedBytes: input.validation.compressedBytes,
          extractedBytes: input.validation.extractedBytes,
          fileCount: input.validation.fileCount,
        }),
      },
    });

    return toVersion(version);
  }

  async setCurrentVersion(input: {
    projectId: string;
    versionId: string;
    stableUrl: string;
    publishedAt: Date;
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.webProjectVersion.update({
        where: { id_projectId: { id: input.versionId, projectId: input.projectId } },
        data: { publishedAt: input.publishedAt },
      });
      await transaction.webProject.update({
        where: { id: input.projectId },
        data: {
          status: "PUBLISHED",
          stableUrl: input.stableUrl,
          publishedAt: input.publishedAt,
          currentVersionId: input.versionId,
          currentVersionProjectId: input.projectId,
        },
      });
    });
  }

  async currentVersion(projectId: string): Promise<WebProjectVersionRecord | null> {
    const project = await this.prisma.webProject.findUnique({
      where: { id: projectId },
      include: { currentVersion: true },
    });

    return project?.currentVersion ? toVersion(project.currentVersion) : null;
  }

  async listVersions(projectId: string): Promise<WebProjectVersionRecord[]> {
    const versions = await this.prisma.webProjectVersion.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
    });

    return versions.map(toVersion);
  }

  async removeVersion(versionId: string): Promise<void> {
    await this.prisma.webProjectVersion.delete({ where: { id: versionId } });
  }

  async listForAdmin(): Promise<WebProjectAdminSummary[]> {
    const projects = await this.prisma.webProject.findMany({
      include: { currentVersion: { select: { version: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return projects.map((project) => ({
      id: project.id,
      title: project.title,
      slug: project.slug,
      summary: project.summary,
      status: project.status,
      stableUrl: project.stableUrl,
      publishedAt: project.publishedAt,
      currentVersion: project.currentVersion?.version ?? null,
    }));
  }

  async listPublished(): Promise<WebProjectPublicSummary[]> {
    const projects = await this.prisma.webProject.findMany({
      where: { status: "PUBLISHED", stableUrl: { not: null }, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
    });

    return projects.map((project) => ({
      id: project.id,
      title: project.title,
      slug: project.slug,
      summary: project.summary,
      stableUrl: project.stableUrl ?? "",
      publishedAt: project.publishedAt ?? new Date(0),
    }));
  }
}
