import type { TaxonomyId } from "../../taxonomy/public";

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export type ArticleDraftInput = {
  id?: string;
  expectedRevision?: number;
  title: string;
  slug: string;
  summary: string;
  coverMediaId: string | null;
  content: Record<string, unknown>;
  categoryId: TaxonomyId | null;
  tagIds: TaxonomyId[];
  seoTitle: string;
  seoDescription: string;
};

export type StoredArticle = Omit<ArticleDraftInput, "id"> & {
  id: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  deletedAt: Date | null;
};

export type ArticleRevisionSnapshot = StoredArticle & {
  revision: number;
};

export interface ArticleService {
  saveDraft(input: ArticleDraftInput): Promise<{ id: string; revision: number }>;
  publish(id: string): Promise<{ slug: string; publishedAt: Date }>;
  restoreRevision(articleId: string, revision: number): Promise<void>;
  recycle(id: string): Promise<void>;
  recover(id: string): Promise<void>;
}

export type ArticleSummary = Pick<
  StoredArticle,
  "id" | "title" | "slug" | "summary" | "publishedAt"
> & {
  coverMediaStorageKey?: string | null;
};

export type ArticleAdminSummary = Pick<
  StoredArticle,
  "id" | "title" | "slug" | "summary" | "status" | "publishedAt" | "deletedAt" | "categoryId"
> & {
  categoryName: string | null;
  revision: number;
  updatedAt: Date;
};

export type ArticleEditorRecord = StoredArticle & {
  revision: number;
  categoryName: string | null;
  updatedAt: Date;
};

export type ArticleRevisionSummary = {
  revision: number;
  title: string;
  createdAt: Date;
};

export type ArticleAdminListOptions = {
  recycled?: boolean;
};

export interface ArticleQueryService {
  findPublishedBySlug(slug: string): Promise<StoredArticle | null>;
  listPublished(): Promise<ArticleSummary[]>;
  searchPublished(query: string): Promise<ArticleSummary[]>;
  listForAdmin(options?: ArticleAdminListOptions): Promise<ArticleAdminSummary[]>;
  findForEditor(id: string): Promise<ArticleEditorRecord | null>;
  listRevisions(articleId: string): Promise<ArticleRevisionSummary[]>;
}
