import type { PrismaClient } from "../../../generated/prisma/client";
import type { ArticleRevisionSnapshot, StoredArticle } from "../domain/article";
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
  tags?: Array<{ tagId: string }>;
};

type PrismaRevisionRow = {
  id: string;
  articleId: string;
  revision: number;
  title: string;
  summary: string;
  content: unknown;
  seoTitle: string;
  seoDescription: string;
  categoryId: string | null;
  tagIds: string[];
  createdAt: Date;
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

export class PrismaArticleRepository implements ArticleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveDraft(input: SaveDraftRecord): Promise<StoredArticle> {
    return this.prisma.$transaction(async (transaction) => {
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
              tags: {
                deleteMany: {},
                create: input.tagIds.map((tagId) => ({ tagId })),
              },
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

      return toStoredArticle(article);
    });
  }

  async findById(id: string): Promise<StoredArticle | null> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });

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
          tags: {
            deleteMany: {},
            create: snapshot.tagIds.map((tagId) => ({ tagId })),
          },
        },
      });
    });
  }

  async publish(id: string, publishedAt: Date): Promise<{ slug: string; publishedAt: Date }> {
    const article = await this.prisma.article.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt },
      select: { slug: true, publishedAt: true },
    });

    return { slug: article.slug, publishedAt: article.publishedAt ?? publishedAt };
  }

  async markDeleted(id: string, deletedAt: Date): Promise<void> {
    await this.prisma.article.update({ where: { id }, data: { deletedAt } });
  }

  async recover(id: string): Promise<void> {
    await this.prisma.article.update({ where: { id }, data: { deletedAt: null } });
  }
}
