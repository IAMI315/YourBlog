export type ArticleStatus = "DRAFT" | "PUBLISHED";

export type ArticleDraftInput = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  coverMediaId: string | null;
  content: Record<string, unknown>;
  categoryId: string | null;
  tagIds: string[];
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
