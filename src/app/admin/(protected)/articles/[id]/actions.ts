"use server";

import { redirect } from "next/navigation";

import { articleService, type ArticleDraftInput } from "../../../../../modules/articles/public";

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

function formDataToDraft(formData: FormData, id?: string): ArticleDraftInput {
  return {
    id,
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

export async function publishArticleAction(id: string) {
  await articleService.publish(id);
  redirect(`/admin/articles/${id}?published=1`);
}

export async function recycleArticleAction(id: string) {
  await articleService.recycle(id);
  redirect("/admin/articles?recycled=1");
}
