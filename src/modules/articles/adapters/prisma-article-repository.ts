import type { PrismaClient } from "../../../generated/prisma/client";
import { AppError } from "../../../infrastructure/errors/app-error";
import {
  contentEquals,
  hasImagesMissingAltText,
  hasPublishableContent,
} from "../application/content";
import type {
  ArticleAdminListOptions,
  ArticleRevisionSnapshot,
  ArticleSummary,
  StoredArticle,
} from "../domain/article";
import type { ArticleRepository, SaveDraftRecord } from "../ports/article-repository";

type PrismaArticleRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverMediaId: string | null;
  content: unknown;
  categoryId: string | null;
  seoTitle: string;
  seoDescription: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | null;
  deletedAt: Date | null;
  updatedAt?: Date;
  tags?: Array<{ tagId: string }>;
  category?: { name: string } | null;
};

type PrismaRevisionRow = {
  articleId: string;
  revision: number;
  title: string;
  summary: string;
  content: unknown;
  seoTitle: string;
  seoDescription: string;
  categoryId: string | null;
  tagIds: string[];
  createdAt?: Date;
};

type PrismaArticleSummaryRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  publishedAt: Date | null;
  coverMedia?: { storageKey: string } | null;
};

function contentToRecord(content: unknown): Record<string, unknown> {
  return content && typeof content === "object" && !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : {};
}

function toPrismaJson(content: Record<string, unknown>) {
  return content as never;
}

function toStoredArticle(row: PrismaArticleRow): StoredArticle {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    coverMediaId: row.coverMediaId,
    content: contentToRecord(row.content),
    categoryId: row.categoryId,
    tagIds: row.tags?.map((tag) => tag.tagId) ?? [],
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: row.status,
    publishedAt: row.publishedAt,
    deletedAt: row.deletedAt,
  };
}

function revisionToSnapshot(row: PrismaRevisionRow): ArticleRevisionSnapshot {
  return {
    id: row.articleId,
    title: row.title,
    slug: "",
    summary: row.summary,
    coverMediaId: null,
    content: contentToRecord(row.content),
    categoryId: row.categoryId,
    tagIds: row.tagIds,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: "DRAFT",
    publishedAt: null,
    deletedAt: null,
    revision: row.revision,
  };
}

function toArticleSummary(row: PrismaArticleSummaryRow): ArticleSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    publishedAt: row.publishedAt,
    coverMediaStorageKey: row.coverMedia?.storageKey ?? null,
  };
}

export class PrismaArticleRepository implements ArticleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveDraftWithRevision(input: SaveDraftRecord): Promise<{ id: string; revision: number }> {
    return this.prisma.$transaction(async (transaction) => {
      if (input.id && typeof input.expectedRevision === "number") {
        const latest = await transaction.articleRevision.findFirst({
          where: { articleId: input.id },
          orderBy: { revision: "desc" },
          select: { revision: true },
        });
        const latestRevision = latest?.revision ?? 0;

        if (latestRevision !== input.expectedRevision) {
          throw new AppError(
            "REVISION_CONFLICT",
            409,
            "这篇文章已在其他位置被修改，请重新加载后再保存。",
          );
        }
      }

      const article = input.id
        ? await transaction.article.update({
            where: { id: input.id },
            data: {
              title: input.title,
              slug: input.slug,
              summary: input.summary,
              coverMediaId: input.coverMediaId,
              content: toPrismaJson(input.content),
              categoryId: input.categoryId,
              seoTitle: input.seoTitle,
              seoDescription: input.seoDescription,
              tags: { deleteMany: {}, create: input.tagIds.map((tagId) => ({ tagId })) },
            },
            include: { tags: true },
          })
        : await transaction.article.create({
            data: {
              title: input.title,
              slug: input.slug,
              summary: input.summary,
              coverMediaId: input.coverMediaId,
              content: toPrismaJson(input.content),
              categoryId: input.categoryId,
              seoTitle: input.seoTitle,
              seoDescription: input.seoDescription,
              tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
            },
            include: { tags: true },
          });
      const storedArticle = toStoredArticle(article);
      const latestRevision = await transaction.articleRevision.findFirst({
        where: { articleId: storedArticle.id },
        orderBy: { revision: "desc" },
      });

      if (latestRevision && contentEquals(contentToRecord(latestRevision.content), storedArticle.content)) {
        return { id: storedArticle.id, revision: latestRevision.revision };
      }

      const revision = (latestRevision?.revision ?? 0) + 1;
      await transaction.articleRevision.create({
        data: {
          articleId: storedArticle.id,
          revision,
          title: storedArticle.title,
          summary: storedArticle.summary,
          content: toPrismaJson(storedArticle.content),
          seoTitle: storedArticle.seoTitle,
          seoDescription: storedArticle.seoDescription,
          categoryId: storedArticle.categoryId,
          tagIds: storedArticle.tagIds,
        },
      });
      await transaction.articleRevision.deleteMany({
        where: { articleId: storedArticle.id, revision: { lt: revision - 19 } },
      });

      return { id: storedArticle.id, revision };
    });
  }

  async findById(id: string): Promise<StoredArticle | null> {
    const article = await this.prisma.article.findUnique({ where: { id }, include: { tags: true } });

    return article ? toStoredArticle(article) : null;
  }

  async latestRevision(articleId: string): Promise<ArticleRevisionSnapshot | null> {
    const revision = await this.prisma.articleRevision.findFirst({
      where: { articleId },
      orderBy: { revision: "desc" },
    });

    return revision ? revisionToSnapshot(revision) : null;
  }

  async createRevision(article: StoredArticle): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const latest = await transaction.articleRevision.findFirst({
        where: { articleId: article.id },
        orderBy: { revision: "desc" },
        select: { revision: true },
      });
      const revision = (latest?.revision ?? 0) + 1;

      await transaction.articleRevision.create({
        data: {
          articleId: article.id,
          revision,
          title: article.title,
          summary: article.summary,
          content: toPrismaJson(article.content),
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          categoryId: article.categoryId,
          tagIds: article.tagIds,
        },
      });
      await transaction.articleRevision.deleteMany({
        where: { articleId: article.id, revision: { lt: revision - 19 } },
      });

      return revision;
    });
  }

  async replaceWithRevision(articleId: string, revision: number): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.articleRevision.findUniqueOrThrow({
        where: { articleId_revision: { articleId, revision } },
      });

      await transaction.article.update({
        where: { id: articleId },
        data: {
          title: snapshot.title,
          summary: snapshot.summary,
          content: snapshot.content as never,
          seoTitle: snapshot.seoTitle,
          seoDescription: snapshot.seoDescription,
          categoryId: snapshot.categoryId,
          tags: { deleteMany: {}, create: snapshot.tagIds.map((tagId) => ({ tagId })) },
        },
      });
    });
  }

  async publishReady(
    id: string,
    publishedAt: Date,
  ): Promise<{ slug: string; publishedAt: Date } | null> {
    return this.prisma.$transaction(async (transaction) => {
      const article = await transaction.article.findUnique({
        where: { id },
        select: {
          title: true,
          content: true,
          coverMediaId: true,
          coverMedia: { select: { altText: true } },
        },
      });

      if (
        !article?.title.trim() ||
        !hasPublishableContent(contentToRecord(article.content)) ||
        hasImagesMissingAltText(article.content) ||
        (article.coverMediaId && !article.coverMedia?.altText.trim())
      ) {
        return null;
      }

      const published = await transaction.article.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt },
        select: { slug: true, publishedAt: true },
      });

      return { slug: published.slug, publishedAt: published.publishedAt ?? publishedAt };
    });
  }

  async markDeleted(id: string, deletedAt: Date): Promise<void> {
    await this.prisma.article.update({ where: { id }, data: { deletedAt } });
  }

  async recover(id: string): Promise<void> {
    await this.prisma.article.update({ where: { id }, data: { deletedAt: null } });
  }

  async findPublishedBySlug(slug: string): Promise<StoredArticle | null> {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      include: { tags: true },
    });

    return article ? toStoredArticle(article) : null;
  }

  async listPublished() {
    const articles = await this.prisma.article.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        publishedAt: true,
        coverMedia: { select: { storageKey: true } },
      },
    });

    return articles.map(toArticleSummary);
  }

  async searchPublished(query: string) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const fullTextMatches = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Article"
      WHERE status = 'PUBLISHED'
        AND "deletedAt" IS NULL
        AND to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))
          @@ plainto_tsquery('simple', ${trimmedQuery})
      ORDER BY "publishedAt" DESC NULLS LAST
      LIMIT 50
    `;
    const fallbackMatches = await this.prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        OR: [
          { title: { contains: trimmedQuery, mode: "insensitive" } },
          { summary: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      select: { id: true },
      take: 50,
    });
    const ids = Array.from(new Set([...fullTextMatches, ...fallbackMatches].map((match) => match.id)));
    if (ids.length === 0) return [];

    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids }, status: "PUBLISHED", deletedAt: null },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        publishedAt: true,
        coverMedia: { select: { storageKey: true } },
      },
    });

    return articles.map(toArticleSummary);
  }

  async listForAdmin(options: ArticleAdminListOptions = {}) {
    const articles = await this.prisma.article.findMany({
      where: options.recycled ? { deletedAt: { not: null } } : { deletedAt: null },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return Promise.all(
      articles.map(async (article) => {
        const latest = await this.prisma.articleRevision.findFirst({
          where: { articleId: article.id },
          orderBy: { revision: "desc" },
          select: { revision: true },
        });

        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          status: article.status,
          publishedAt: article.publishedAt,
          deletedAt: article.deletedAt,
          categoryId: article.categoryId,
          categoryName: article.category?.name ?? null,
          revision: latest?.revision ?? 0,
          updatedAt: article.updatedAt,
        };
      }),
    );
  }

  async findForEditor(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true, category: { select: { name: true } } },
    });

    if (!article) return null;
    const latest = await this.prisma.articleRevision.findFirst({
      where: { articleId: id },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });

    return {
      ...toStoredArticle(article),
      categoryName: article.category?.name ?? null,
      revision: latest?.revision ?? 0,
      updatedAt: article.updatedAt,
    };
  }

  async listRevisions(articleId: string) {
    return this.prisma.articleRevision.findMany({
      where: { articleId },
      orderBy: { revision: "desc" },
      select: { revision: true, title: true, createdAt: true },
    });
  }
}
