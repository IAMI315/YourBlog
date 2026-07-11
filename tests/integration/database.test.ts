import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, test } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for database integration tests");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

beforeAll(async () => {
  await prisma.article.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("persists Chinese article title and TipTap content as UTF-8", async () => {
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
      slug: "utf8-round-trip",
      content,
    },
  });

  const article = await prisma.article.findUniqueOrThrow({ where: { id: created.id } });

  expect(article.title).toBe("中文编码测试");
  expect(article.content).toEqual(content);
});
