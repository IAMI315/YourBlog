"use server";

import { redirect } from "next/navigation";

import { requireAdminSession } from "../../../../modules/auth/public";
import {
  MAX_PAGE_IMPORT_BYTES,
  pageService,
  parsePageTransferPackage,
} from "../../../../modules/site-designer/public";

export async function importPageAction(formData: FormData): Promise<void> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    redirect("/admin/pages?importError=PAGE_IMPORT_FILE_REQUIRED");
  }
  if (file.size > MAX_PAGE_IMPORT_BYTES) {
    redirect("/admin/pages?importError=PAGE_IMPORT_FILE_TOO_LARGE");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    redirect("/admin/pages?importError=PAGE_IMPORT_INVALID");
  }

  const page = parsePageTransferPackage(raw);
  if (!page) {
    redirect("/admin/pages?importError=PAGE_IMPORT_INVALID");
  }

  const result = await pageService.saveDraft(page);
  if (!result.ok) {
    const error = result.errors.slug === "PAGE_SLUG_TAKEN"
      ? "PAGE_IMPORT_SLUG_TAKEN"
      : "PAGE_IMPORT_VALIDATION_FAILED";
    redirect(`/admin/pages?importError=${error}`);
  }

  redirect(`/admin/pages/${result.id}?imported=1`);
}
