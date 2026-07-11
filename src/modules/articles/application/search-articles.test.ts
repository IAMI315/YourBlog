import { describe, expect, it } from "vitest";

import type { ArticleStatus, ArticleSummary } from "../domain/article";
import { searchArticles, type ArticleSearchRepository } from "./search-articles";

type SearchRecord = ArticleSummary & {
  status: ArticleStatus;
  deletedAt: Date | null;
};

class MemorySearchRepository implements ArticleSearchRepository {
  constructor(private readonly records: SearchRecord[]) {}

  async searchPublished(query: string): Promise<ArticleSummary[]> {
    const normalizedQuery = query.toLocaleLowerCase();

    return this.records
      .filter((record) => record.status === "PUBLISHED" && record.deletedAt === null)
      .filter((record) =>
        `${record.title} ${record.summary}`.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map(({ id, title, slug, summary, publishedAt }) => ({
        id,
        title,
        slug,
        summary,
        publishedAt,
      }));
  }
}

const records: SearchRecord[] = [
  {
    id: "published",
    title: "自托管 Docker 教程",
    slug: "self-hosted-docker",
    summary: "从零部署个人博客",
    publishedAt: new Date("2026-07-11T00:00:00.000Z"),
    status: "PUBLISHED",
    deletedAt: null,
  },
  {
    id: "draft",
    title: "自托管 草稿",
    slug: "draft",
    summary: "草稿不应公开",
    publishedAt: null,
    status: "DRAFT",
    deletedAt: null,
  },
  {
    id: "recycled",
    title: "自托管 回收站",
    slug: "recycled",
    summary: "回收站不应公开",
    publishedAt: new Date("2026-07-10T00:00:00.000Z"),
    status: "PUBLISHED",
    deletedAt: new Date("2026-07-11T00:00:00.000Z"),
  },
];

describe("searchArticles", () => {
  it("finds Chinese tutorial text while excluding drafts and recycled articles", async () => {
    const results = await searchArticles({ repository: new MemorySearchRepository(records) }, "自托管");

    expect(results.map((result) => result.id)).toEqual(["published"]);
  });

  it("returns no results for blank queries", async () => {
    const results = await searchArticles({ repository: new MemorySearchRepository(records) }, "   ");

    expect(results).toEqual([]);
  });
});
