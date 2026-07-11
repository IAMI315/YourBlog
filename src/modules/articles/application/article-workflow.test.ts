import { describe, expect, it } from "vitest";

import type { Clock } from "../../../infrastructure/time/clock";
import type { ArticleDraftInput, StoredArticle } from "../domain/article";
import type { ArticleRepository, SaveDraftRecord } from "../ports/article-repository";
import { publishArticle } from "./publish-article";
import { recoverArticle, recycleArticle } from "./recycle-article";
import { restoreRevision } from "./restore-revision";
import { saveDraft } from "./save-draft";

const NOW = new Date("2026-07-11T10:00:00.000Z");
const clock: Clock = { now: () => NOW };
const CHINESE_TITLE = "\u6280\u672f\u6559\u7a0b";
const CHINESE_SUMMARY = "\u6458\u8981";
const CHINESE_BODY = "\u4f60\u597d";
const CHINESE_DESCRIPTION = "\u4e2d\u6587\u79d1\u6280\u6559\u7a0b";

const baseDraft: ArticleDraftInput = {
  title: CHINESE_TITLE,
  slug: "",
  summary: CHINESE_SUMMARY,
  coverMediaId: null,
  content: { type: "doc", blocks: [{ type: "paragraph", text: CHINESE_BODY }] },
  categoryId: null,
  tagIds: [],
  seoTitle: CHINESE_TITLE,
  seoDescription: CHINESE_DESCRIPTION,
};

class InMemoryArticleRepository implements ArticleRepository {
  articles = new Map<string, StoredArticle>();
  revisions = new Map<string, Array<StoredArticle & { revision: number }>>();
  nextRevision = new Map<string, number>();
  nextId = 1;

  async saveDraftWithRevision(input: SaveDraftRecord) {
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
    const latestRevision = await this.latestRevision(id);

    if (latestRevision && JSON.stringify(latestRevision.content) === JSON.stringify(article.content)) {
      return { id, revision: latestRevision.revision };
    }

    return { id, revision: await this.createRevision(article) };
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

  async publishReady(id: string, publishedAt: Date) {
    const article = this.articles.get(id);
    if (!article?.title.trim() || Object.keys(article.content).length === 0) return null;
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

  async findPublishedBySlug(slug: string) {
    return (
      Array.from(this.articles.values()).find(
        (article) => article.slug === slug && article.status === "PUBLISHED" && !article.deletedAt,
      ) ?? null
    );
  }

  async listPublished() {
    return Array.from(this.articles.values())
      .filter((article) => article.status === "PUBLISHED" && !article.deletedAt)
      .map(({ id, title, slug, summary, publishedAt }) => ({
        id,
        title,
        slug,
        summary,
        publishedAt,
      }));
  }

  async searchPublished(query: string) {
    const normalizedQuery = query.toLocaleLowerCase();

    return (await this.listPublished()).filter((article) =>
      `${article.title} ${article.summary}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }

  async listForAdmin() {
    return Array.from(this.articles.values()).map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      status: article.status,
      publishedAt: article.publishedAt,
      deletedAt: article.deletedAt,
      categoryId: article.categoryId,
      categoryName: null,
      revision: this.revisions.get(article.id)?.at(-1)?.revision ?? 0,
      updatedAt: NOW,
    }));
  }

  async findForEditor(id: string) {
    const article = this.articles.get(id);
    if (!article) return null;
    return {
      ...article,
      categoryName: null,
      revision: this.revisions.get(id)?.at(-1)?.revision ?? 0,
      updatedAt: NOW,
    };
  }

  async listRevisions(articleId: string) {
    return (this.revisions.get(articleId) ?? []).map((revision) => ({
      revision: revision.revision,
      title: revision.title,
      createdAt: NOW,
    }));
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

    const second = await saveDraft(
      { repository },
      { ...baseDraft, id: first.id, summary: "\u66f4\u65b0\u6458\u8981" },
    );

    expect(second.revision).toBe(1);
    expect(repository.revisions.get(first.id)).toHaveLength(1);
  });

  it("creates revisions when content changes and retains exactly twenty", async () => {
    const repository = new InMemoryArticleRepository();
    const first = await saveDraft({ repository }, baseDraft);

    for (let index = 0; index < 25; index++) {
      await saveDraft(
        { repository },
        { ...baseDraft, id: first.id, content: { blocks: [{ text: `version ${index}` }] } },
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
