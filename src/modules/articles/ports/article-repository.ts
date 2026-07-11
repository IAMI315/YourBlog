import type { ArticleRevisionSnapshot, StoredArticle } from "../domain/article";

export type SaveDraftRecord = Omit<StoredArticle, "id" | "status" | "publishedAt" | "deletedAt"> & {
  id?: string;
};

export interface ArticleRepository {
  saveDraftWithRevision(input: SaveDraftRecord): Promise<{ id: string; revision: number }>;
  findById(id: string): Promise<StoredArticle | null>;
  latestRevision(articleId: string): Promise<ArticleRevisionSnapshot | null>;
  createRevision(article: StoredArticle): Promise<number>;
  replaceWithRevision(articleId: string, revision: number): Promise<void>;
  publishReady(id: string, publishedAt: Date): Promise<{ slug: string; publishedAt: Date } | null>;
  markDeleted(id: string, deletedAt: Date): Promise<void>;
  recover(id: string): Promise<void>;
  findPublishedBySlug(slug: string): Promise<StoredArticle | null>;
  listPublished(): Promise<Array<Pick<StoredArticle, "id" | "title" | "slug" | "summary" | "publishedAt">>>;
}
