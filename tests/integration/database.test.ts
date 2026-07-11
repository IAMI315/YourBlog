import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, test } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

export function assertTestDatabaseUrl(value: string | undefined): asserts value is string {
  if (!value) {
    throw new Error("DATABASE_URL is required for database integration tests");
  }

  const databaseName = new URL(value).pathname.slice(1);

  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to run database integration tests against '${databaseName}'`);
  }
}

assertTestDatabaseUrl(databaseUrl);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const ownedArticleIds = new Set<string>();
const ownedProjectIds = new Set<string>();

afterEach(async () => {
  const articleIds = [...ownedArticleIds];
  const projectIds = [...ownedProjectIds];

  await prisma.webProject.updateMany({
    where: { id: { in: projectIds } },
    data: { currentVersionId: null, currentVersionProjectId: null },
  });
  await prisma.webProjectVersion.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.webProject.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.article.deleteMany({ where: { id: { in: articleIds } } });

  const [articleResidue, projectResidue, versionResidue] = await Promise.all([
    prisma.article.count({ where: { id: { in: articleIds } } }),
    prisma.webProject.count({ where: { id: { in: projectIds } } }),
    prisma.webProjectVersion.count({ where: { projectId: { in: projectIds } } }),
  ]);
  expect({ articleResidue, projectResidue, versionResidue }).toEqual({
    articleResidue: 0,
    projectResidue: 0,
    versionResidue: 0,
  });

  ownedProjectIds.clear();
  ownedArticleIds.clear();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("rejects a non-test database URL before writes", () => {
  expect(() => assertTestDatabaseUrl("postgresql://blog:blog@localhost:5432/blog")).toThrow(
    "Refusing to run database integration tests against 'blog'",
  );
});

test("persists Chinese article title and TipTap content as UTF-8 without leaving test data", async () => {
  const slug = `utf8-round-trip-${randomUUID()}`;
  const content = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "保持 UTF-8" }],
      },
    ],
  };

  const created = await prisma.article.create({
    data: {
      title: "中文编码测试",
      slug,
      content,
    },
  });
  ownedArticleIds.add(created.id);

  const article = await prisma.article.findUniqueOrThrow({ where: { id: created.id } });

  expect(article.title).toBe("中文编码测试");
  expect(article.content).toEqual(content);
});

describe("web project current version ownership", () => {
  test("rejects a current version owned by another project", async () => {
    const suffix = randomUUID();
    const firstProject = await prisma.webProject.create({
      data: { title: "First", slug: `first-${suffix}` },
    });
    ownedProjectIds.add(firstProject.id);

    const secondProject = await prisma.webProject.create({
      data: { title: "Second", slug: `second-${suffix}` },
    });
    ownedProjectIds.add(secondProject.id);

    const versionData = {
      version: 1,
      compressedBytes: 1,
      extractedBytes: 1,
      fileCount: 1,
      checksum: suffix,
      validation: { valid: true },
    };
    const [firstVersion, secondVersion] = await Promise.all([
      prisma.webProjectVersion.create({
        data: {
          ...versionData,
          projectId: firstProject.id,
          storagePrefix: `projects/first-${suffix}/1`,
        },
      }),
      prisma.webProjectVersion.create({
        data: {
          ...versionData,
          projectId: secondProject.id,
          storagePrefix: `projects/second-${suffix}/1`,
        },
      }),
    ]);

    await expect(
      prisma.webProject.update({
        where: { id: firstProject.id },
        data: {
          currentVersionId: firstVersion.id,
          currentVersionProjectId: firstProject.id,
        },
      }),
    ).resolves.toMatchObject({ currentVersionId: firstVersion.id });

    await expect(
      prisma.webProject.update({
        where: { id: firstProject.id },
        data: {
          currentVersionId: firstVersion.id,
          currentVersionProjectId: null,
        },
      }),
    ).rejects.toThrow("WebProject_currentVersion_owner_check");

    await expect(
      prisma.webProject.update({
        where: { id: firstProject.id },
        data: {
          currentVersionId: secondVersion.id,
          currentVersionProjectId: firstProject.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    await expect(
      prisma.webProject.update({
        where: { id: firstProject.id },
        data: {
          currentVersionId: secondVersion.id,
          currentVersionProjectId: secondProject.id,
        },
      }),
    ).rejects.toThrow("WebProject_currentVersion_owner_check");
  });
});
