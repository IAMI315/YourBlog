import type { PrismaClient } from "../../../generated/prisma/client";
import type {
  PageAdminSummary,
  PageEditorRecord,
  PageNavigationItem,
  PageSearchResult,
  StoredPage,
} from "../domain/page";
import type { PageRepository, SavePageDraftRecord } from "../ports/page-repository";

type PrismaPageRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: unknown;
  coverMediaId: string | null;
  showInNavigation: boolean;
  seoTitle: string;
  seoDescription: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | null;
  updatedAt?: Date;
  coverMedia?: { storageKey: string } | null;
};

function contentToRecord(content: unknown): Record<string, unknown> {
  return content && typeof content === "object" && !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : {};
}

function toStoredPage(row: PrismaPageRow): StoredPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: contentToRecord(row.content),
    coverMediaId: row.coverMediaId,
    showInNavigation: row.showInNavigation,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: row.status,
    publishedAt: row.publishedAt,
    coverMediaStorageKey: row.coverMedia?.storageKey ?? null,
  };
}

export class PrismaPageRepository implements PageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findIdBySlug(slug: string): Promise<string | null> {
    const page = await this.prisma.page.findUnique({ where: { slug }, select: { id: true } });

    return page?.id ?? null;
  }

  async saveDraft(input: SavePageDraftRecord): Promise<{ id: string; slug: string }> {
    const data = {
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      content: input.content as never,
      coverMediaId: input.coverMediaId,
      showInNavigation: input.showInNavigation,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
    };
    const page = input.id
      ? await this.prisma.page.update({ where: { id: input.id }, data, select: { id: true, slug: true } })
      : await this.prisma.page.create({ data, select: { id: true, slug: true } });

    return page;
  }

  async findById(id: string): Promise<StoredPage | null> {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: { coverMedia: { select: { storageKey: true } } },
    });

    return page ? toStoredPage(page) : null;
  }

  async publish(id: string, publishedAt: Date): Promise<{ slug: string; publishedAt: Date }> {
    const page = await this.prisma.page.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt },
      select: { slug: true, publishedAt: true },
    });

    return { slug: page.slug, publishedAt: page.publishedAt ?? publishedAt };
  }

  async unpublish(id: string): Promise<void> {
    await this.prisma.page.update({
      where: { id },
      data: { status: "DRAFT", publishedAt: null },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.page.delete({ where: { id } });
  }

  async findPublishedBySlug(slug: string): Promise<StoredPage | null> {
    const page = await this.prisma.page.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: { coverMedia: { select: { storageKey: true } } },
    });

    return page ? toStoredPage(page) : null;
  }

  async searchPublished(query: string): Promise<PageSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    return this.prisma.page.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: trimmedQuery, mode: "insensitive" } },
          { summary: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true, summary: true },
      take: 50,
    });
  }

  async listForNavigation(): Promise<PageNavigationItem[]> {
    return this.prisma.page.findMany({
      where: { status: "PUBLISHED", showInNavigation: true },
      orderBy: { title: "asc" },
      select: { title: true, slug: true },
    });
  }

  async listForAdmin(): Promise<PageAdminSummary[]> {
    return this.prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        showInNavigation: true,
        updatedAt: true,
        publishedAt: true,
      },
    });
  }

  async findForEditor(id: string): Promise<PageEditorRecord | null> {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: { coverMedia: { select: { storageKey: true } } },
    });

    return page
      ? { ...toStoredPage(page), updatedAt: page.updatedAt }
      : null;
  }
}
