import {
  RESERVED_PAGE_SLUGS,
  type PageDraftInput,
  type PageSaveErrors,
  type PageSaveResult,
} from "../domain/page";
import type { PageRepository, SavePageDraftRecord } from "../ports/page-repository";
import { normalizePageSlug } from "./page-slug";

type SavePageDraftDependencies = {
  repository: PageRepository;
};

function validatePageDraft(input: SavePageDraftRecord): PageSaveErrors {
  const errors: PageSaveErrors = {};

  if (!input.title) {
    errors.title = "PAGE_TITLE_REQUIRED";
  } else if (input.title.length > 160) {
    errors.title = "PAGE_TITLE_TOO_LONG";
  }

  if (input.summary.length > 400) {
    errors.summary = "PAGE_SUMMARY_TOO_LONG";
  }

  if (RESERVED_PAGE_SLUGS.has(input.slug)) {
    errors.slug = "PAGE_SLUG_RESERVED";
  }

  if (input.seoTitle.length > 160) {
    errors.seoTitle = "PAGE_SEO_TITLE_TOO_LONG";
  }

  if (input.seoDescription.length > 320) {
    errors.seoDescription = "PAGE_SEO_DESCRIPTION_TOO_LONG";
  }

  return errors;
}

export async function savePageDraft(
  { repository }: SavePageDraftDependencies,
  input: PageDraftInput,
): Promise<PageSaveResult> {
  const draft: SavePageDraftRecord = {
    ...input,
    title: input.title.trim(),
    slug: normalizePageSlug(input.slug, input.title),
    summary: input.summary.trim(),
    seoTitle: input.seoTitle.trim(),
    seoDescription: input.seoDescription.trim(),
  };
  const errors = validatePageDraft(draft);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const existingId = await repository.findIdBySlug(draft.slug);

  if (existingId && existingId !== draft.id) {
    return { ok: false, errors: { slug: "PAGE_SLUG_TAKEN" } };
  }

  return { ok: true, ...(await repository.saveDraft(draft)) };
}

export { validatePageDraft };
