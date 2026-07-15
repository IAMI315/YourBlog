import type { PageDraftInput, PageEditorRecord } from "../domain/page";

export const PAGE_TRANSFER_FORMAT = "yourblog-page";
export const PAGE_TRANSFER_VERSION = 1;
export const MAX_PAGE_IMPORT_BYTES = 1024 * 1024;

export type PageTransferPackage = {
  format: typeof PAGE_TRANSFER_FORMAT;
  version: typeof PAGE_TRANSFER_VERSION;
  exportedAt: string;
  page: Pick<
    PageDraftInput,
    "title" | "slug" | "summary" | "content" | "showInNavigation" | "seoTitle" | "seoDescription"
  >;
};

export type ImportedPageDraft = Omit<PageDraftInput, "id">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  return typeof field === "string" ? field : null;
}

export function createPageTransferPackage(page: PageEditorRecord): PageTransferPackage {
  return {
    format: PAGE_TRANSFER_FORMAT,
    version: PAGE_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    page: {
      title: page.title,
      slug: page.slug,
      summary: page.summary,
      content: page.content,
      showInNavigation: page.showInNavigation,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
    },
  };
}

export function parsePageTransferPackage(value: unknown): ImportedPageDraft | null {
  if (!isRecord(value) || value.format !== PAGE_TRANSFER_FORMAT || value.version !== PAGE_TRANSFER_VERSION) {
    return null;
  }

  const page = value.page;
  if (!isRecord(page) || !isRecord(page.content) || typeof page.showInNavigation !== "boolean") {
    return null;
  }

  const title = readString(page, "title");
  const slug = readString(page, "slug");
  const summary = readString(page, "summary");
  const seoTitle = readString(page, "seoTitle");
  const seoDescription = readString(page, "seoDescription");

  if (
    title === null
    || slug === null
    || summary === null
    || seoTitle === null
    || seoDescription === null
  ) {
    return null;
  }

  return {
    title,
    slug,
    summary,
    content: page.content,
    coverMediaId: null,
    showInNavigation: page.showInNavigation,
    seoTitle,
    seoDescription,
  };
}
