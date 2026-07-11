"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteUnusedMedia, updateMediaAltText } from "../../../../modules/media/public";

export async function updateMediaAltTextAction(id: string, formData: FormData) {
  await updateMediaAltText(id, String(formData.get("altText") ?? ""));
  revalidatePath("/admin/media");
}

export async function deleteUnusedMediaAction(id: string) {
  await deleteUnusedMedia(id);
  redirect("/admin/media?deleted=1");
}
