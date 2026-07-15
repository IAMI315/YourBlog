"use server";

import { redirect } from "next/navigation";

import { AppError } from "../../../../../infrastructure/errors/app-error";
import { pageService, type PageDraftInput, type PageSaveErrors } from "../../../../../modules/site-designer/public";

function parseContent(formData: FormData): Record<string, unknown> {
  try {
    const value = JSON.parse(String(formData.get("content") ?? "{}")) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function formDataToPageDraft(formData: FormData, id?: string): PageDraftInput {
  const coverMediaId = String(formData.get("coverMediaId") ?? "").trim();

  return {
    id,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    content: parseContent(formData),
    coverMediaId: coverMediaId || null,
    showInNavigation: formData.get("showInNavigation") === "on",
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
  };
}

function errorsToSearchParams(errors: PageSaveErrors): string {
  const params = new URLSearchParams();

  for (const [field, code] of Object.entries(errors)) {
    if (code) params.set(field, code);
  }

  return params.toString();
}

function pageEditPath(id: string | undefined): string {
  return id ? `/admin/pages/${id}` : "/admin/pages/new";
}

async function savePageFromForm(id: string | undefined, formData: FormData) {
  return pageService.saveDraft(formDataToPageDraft(formData, id));
}

export async function savePageAction(id: string | undefined, formData: FormData): Promise<void> {
  const result = await savePageFromForm(id, formData);

  if (!result.ok) {
    redirect(`${pageEditPath(id)}?${errorsToSearchParams(result.errors)}`);
  }

  redirect(`/admin/pages/${result.id}?saved=1`);
}

export async function publishPageAction(id: string, formData: FormData): Promise<void> {
  const saved = await savePageFromForm(id, formData);

  if (!saved.ok) {
    redirect(`${pageEditPath(id)}?${errorsToSearchParams(saved.errors)}`);
  }

  try {
    await pageService.publish(id);
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/admin/pages/${id}?publishError=${error.code}`);
    }

    throw error;
  }

  redirect(`/admin/pages/${id}?published=1`);
}

export async function unpublishPageAction(id: string): Promise<void> {
  await pageService.unpublish(id);
  redirect(`/admin/pages/${id}?unpublished=1`);
}

export async function deletePageAction(id: string): Promise<void> {
  await pageService.delete(id);
  redirect("/admin/pages?deleted=1");
}
