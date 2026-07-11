import type { ArticleRevisionSnapshot, StoredArticle } from "../domain/article";

export type SaveDraftRecord = Omit<StoredArticle, "id" | "status" | "publishedAt" | "deletedAt"> & {
  id?: string;
};

export interface ArticleRepository {
  saveDraft(input: SaveDraftRecord): Promise<StoredArticle>;
  findById(id: string): Promise<StoredArticle | null>;
  latestRevision(articleId: string): Promise<ArticleRevisionSnapshot | null>;
  createRevision(article: StoredArticle): Promise<number>;
  replaceWithRevision(articleId: string, revision: number): Promise<void>;
  publish(id: string, publishedAt: Date): Promise<{ slug: string; publishedAt: Date }>;
  markDeleted(id: string, deletedAt: Date): Promise<void>;
  recover(id: string): Promise<void>;
}
