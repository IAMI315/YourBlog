"use server";

import { redirect } from "next/navigation";

import { AppError } from "../../../../../infrastructure/errors/app-error";
import {
  articleQueries,
  articleService,
  type ArticleDraftInput,
} from "../../../../../modules/articles/public";

type AutosaveArticleInput = {
  articleId: string;
  value: Record<string, unknown>;
  expectedRevision: number;
};

function parseContent(formData: FormData): Record<string, unknown> {
  const rawValue = String(formData.get("content") ?? "{}");

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseExpectedRevision(formData: FormData): number | undefined {
  const rawValue = formData.get("expectedRevision");
  if (rawValue === null) return undefined;
  const parsed = Number(rawValue);

  return Number.isInteger(parsed) ? parsed : undefined;
}

function formDataToDraft(formData: FormData, id?: string): ArticleDraftInput {
  return {
    id,
    expectedRevision: parseExpectedRevision(formData),
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    coverMediaId: null,
    content: parseContent(formData),
    categoryId: null,
    tagIds: [],
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
  };
}

export async function saveArticleAction(id: string | undefined, formData: FormData) {
  const result = await articleService.saveDraft(formDataToDraft(formData, id));
  redirect(`/admin/articles/${result.id}?saved=1`);
}

export async function autosaveArticleAction(input: AutosaveArticleInput) {
  const article = await articleQueries.findForEditor(input.articleId);

  if (!article) {
    return { ok: false as const, code: "REVISION_CONFLICT" as const };
  }

  try {
    const result = await articleService.saveDraft({
      id: input.articleId,
      expectedRevision: input.expectedRevision,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      coverMediaId: article.coverMediaId,
      content: input.value,
      categoryId: article.categoryId,
      tagIds: article.tagIds,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
    });

    return { ok: true as const, revision: result.revision };
  } catch (error) {
    if (error instanceof AppError && error.code === "REVISION_CONFLICT") {
      return { ok: false as const, code: "REVISION_CONFLICT" as const };
    }

    throw error;
  }
}

export async function publishArticleAction(id: string) {
  await articleService.publish(id);
  redirect(`/admin/articles/${id}?published=1`);
}

export async function recycleArticleAction(id: string) {
  await articleService.recycle(id);
  redirect("/admin/articles?recycled=1");
}
