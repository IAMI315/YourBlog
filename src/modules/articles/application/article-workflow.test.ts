import { describe, expect, it } from "vitest";

import type { Clock } from "../../../infrastructure/time/clock";
import type { ArticleDraftInput, StoredArticle } from "../domain/article";
import type { ArticleRepository } from "../ports/article-repository";
import { publishArticle } from "./publish-article";
import { recoverArticle, recycleArticle } from "./recycle-article";
import { restoreRevision } from "./restore-revision";
import { saveDraft } from "./save-draft";

const NOW = new Date("2026-07-11T10:00:00.000Z");
const clock: Clock = { now: () => NOW };

const baseDraft: ArticleDraftInput = {
  title: "技术教程",
  slug: "",
  summary: "摘要",
  coverMediaId: null,
  content: { type: "doc", blocks: [{ type: "paragraph", text: "你好" }] },
  categoryId: null,
  tagIds: [],
  seoTitle: "技术教程",
  seoDescription: "中文科技教程",
};

class InMemoryArticleRepository implements ArticleRepository {
  articles = new Map<string, StoredArticle>();
  revisions = new Map<string, Array<StoredArticle & { revision: number }>>();
  nextRevision = new Map<string, number>();
  nextId = 1;

  async saveDraft(input: Omit<StoredArticle, "id" | "status" | "publishedAt" | "deletedAt"> & {
    id?: string;
  }) {
    const id = input.id ?? `article-${this.nextId++}`;
    const existing = this.articles.get(id);
    const article: StoredArticle = {
      id,
      ...input,
      status: existing?.status ?? "DRAFT",
      publishedAt: existing?.publishedAt ?? null,
      deletedAt: existing?.deletedAt ?? null,
    };
    this.articles.set(id, article);
    return article;
  }

  async findById(id: string) {
    return this.articles.get(id) ?? null;
  }

  async latestRevision(articleId: string) {
    return this.revisions.get(articleId)?.at(-1) ?? null;
  }

  async createRevision(article: StoredArticle) {
    const revisions = this.revisions.get(article.id) ?? [];
    const revisionNumber = (this.nextRevision.get(article.id) ?? 0) + 1;
    const revision = { ...article, revision: revisionNumber };
    this.nextRevision.set(article.id, revisionNumber);
    revisions.push(revision);
    this.revisions.set(article.id, revisions.slice(-20));
    return revisionNumber;
  }

  async replaceWithRevision(articleId: string, revision: number) {
    const snapshot = this.revisions.get(articleId)?.find((item) => item.revision === revision);
    if (!snapshot) throw new Error("Revision not found");
    this.articles.set(articleId, { ...snapshot });
  }

  async publish(id: string, publishedAt: Date) {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    const published = { ...article, status: "PUBLISHED" as const, publishedAt };
    this.articles.set(id, published);
    return { slug: published.slug, publishedAt };
  }

  async markDeleted(id: string, deletedAt: Date) {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    this.articles.set(id, { ...article, deletedAt });
  }

  async recover(id: string) {
    const article = this.articles.get(id);
    if (!article) throw new Error("Article not found");
    this.articles.set(id, { ...article, deletedAt: null });
  }
}

describe("article workflow", () => {
  it("creates a deterministic slug fallback for Chinese-only titles", async () => {
    const repository = new InMemoryArticleRepository();

    const result = await saveDraft({ repository }, baseDraft);

    expect(repository.articles.get(result.id)?.slug).toMatch(/^article-[a-f0-9]{8}$/);
  });

  it("autosaves without a new revision when content is unchanged", async () => {
    const repository = new InMemoryArticleRepository();
    const first = await saveDraft({ repository }, baseDraft);

    const second = await saveDraft({ repository }, { ...baseDraft, id: first.id, summary: "更新摘要" });

    expect(second.revision).toBe(1);
    expect(repository.revisions.get(first.id)).toHaveLength(1);
  });

  it("creates revisions when content changes and retains exactly twenty", async () => {
    const repository = new InMemoryArticleRepository();
    const first = await saveDraft({ repository }, baseDraft);

    for (let index = 0; index < 25; index++) {
      await saveDraft(
        { repository },
        { ...baseDraft, id: first.id, content: { blocks: [{ text: `版本 ${index}` }] } },
      );
    }

    const revisions = repository.revisions.get(first.id) ?? [];
    expect(revisions).toHaveLength(20);
    expect(revisions.at(-1)?.revision).toBe(26);
  });

  it("rejects publishing without title or content", async () => {
    const repository = new InMemoryArticleRepository();
    const draft = await saveDraft({ repository }, { ...baseDraft, title: "", content: {} });

    await expect(publishArticle({ repository, clock }, draft.id)).rejects.toMatchObject({
      code: "ARTICLE_NOT_READY",
    });
  });

  it("returns an atomic publish result", async () => {
    const repository = new InMemoryArticleRepository();
    const draft = await saveDraft({ repository }, { ...baseDraft, title: "hello world" });

    await expect(publishArticle({ repository, clock }, draft.id)).resolves.toEqual({
      slug: "hello-world",
      publishedAt: NOW,
    });
    expect(repository.articles.get(draft.id)?.status).toBe("PUBLISHED");
  });

  it("sets recycle-bin timestamps and recovers before thirty days", async () => {
    const repository = new InMemoryArticleRepository();
    const draft = await saveDraft({ repository }, baseDraft);

    await recycleArticle({ repository, clock }, draft.id);
    expect(repository.articles.get(draft.id)?.deletedAt).toEqual(NOW);

    await recoverArticle({ repository, clock }, draft.id);
    expect(repository.articles.get(draft.id)?.deletedAt).toBeNull();
  });

  it("restores an earlier revision", async () => {
    const repository = new InMemoryArticleRepository();
    const draft = await saveDraft({ repository }, { ...baseDraft, title: "hello" });
    await saveDraft({ repository }, { ...baseDraft, id: draft.id, content: { blocks: ["new"] } });

    await restoreRevision({ repository }, draft.id, 1);

    expect(repository.articles.get(draft.id)?.content).toEqual(baseDraft.content);
  });
});
