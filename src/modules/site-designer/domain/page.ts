export type PageStatus = "DRAFT" | "PUBLISHED";

export type PageDraftInput = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  content: Record<string, unknown>;
  coverMediaId: string | null;
  showInNavigation: boolean;
  seoTitle: string;
  seoDescription: string;
};

export type StoredPage = Omit<PageDraftInput, "id"> & {
  id: string;
  status: PageStatus;
  publishedAt: Date | null;
  coverMediaStorageKey?: string | null;
};

export type PageEditorRecord = StoredPage & {
  updatedAt: Date;
};

export type PageAdminSummary = Pick<
  PageEditorRecord,
  "id" | "title" | "slug" | "status" | "showInNavigation" | "updatedAt" | "publishedAt"
>;

export type PageNavigationItem = Pick<StoredPage, "title" | "slug">;

export type PageSearchResult = Pick<StoredPage, "id" | "title" | "slug" | "summary">;

export type PageQueryService = {
  findPublishedBySlug(slug: string): Promise<StoredPage | null>;
  searchPublished(query: string): Promise<PageSearchResult[]>;
  listForNavigation(): Promise<PageNavigationItem[]>;
  listForAdmin(): Promise<PageAdminSummary[]>;
  findForEditor(id: string): Promise<PageEditorRecord | null>;
};

export type PageService = {
  saveDraft(input: PageDraftInput): Promise<PageSaveResult>;
  publish(id: string): Promise<{ slug: string; publishedAt: Date }>;
  unpublish(id: string): Promise<void>;
  delete(id: string): Promise<void>;
};

export type PageSaveErrorCode =
  | "PAGE_TITLE_REQUIRED"
  | "PAGE_TITLE_TOO_LONG"
  | "PAGE_SUMMARY_TOO_LONG"
  | "PAGE_SLUG_RESERVED"
  | "PAGE_SLUG_TAKEN"
  | "PAGE_SEO_TITLE_TOO_LONG"
  | "PAGE_SEO_DESCRIPTION_TOO_LONG";

export type PageSaveErrors = Partial<
  Record<"title" | "summary" | "slug" | "seoTitle" | "seoDescription", PageSaveErrorCode>
>;

export type PageSaveResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; errors: PageSaveErrors };

export const RESERVED_PAGE_SLUGS = new Set([
  "admin",
  "api",
  "archive",
  "about",
  "labs",
  "media",
  "pages",
  "tutorials",
  "_next",
  "favicon.ico",
]);
