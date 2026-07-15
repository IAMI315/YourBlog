import type {
  PageAdminSummary,
  PageEditorRecord,
  PageNavigationItem,
  PageSearchResult,
  StoredPage,
} from "../domain/page";

export type SavePageDraftRecord = Omit<
  StoredPage,
  "id" | "status" | "publishedAt" | "coverMediaStorageKey"
> & {
  id?: string;
};

export interface PageRepository {
  findIdBySlug(slug: string): Promise<string | null>;
  saveDraft(input: SavePageDraftRecord): Promise<{ id: string; slug: string }>;
  findById(id: string): Promise<StoredPage | null>;
  publish(id: string, publishedAt: Date): Promise<{ slug: string; publishedAt: Date }>;
  unpublish(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  findPublishedBySlug(slug: string): Promise<StoredPage | null>;
  searchPublished(query: string): Promise<PageSearchResult[]>;
  listForNavigation(): Promise<PageNavigationItem[]>;
  listForAdmin(): Promise<PageAdminSummary[]>;
  findForEditor(id: string): Promise<PageEditorRecord | null>;
}
