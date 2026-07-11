"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  publishProject,
  rollbackProject,
  verifyStagedUploadTicket,
} from "../../../../modules/web-projects/public";

export async function publishUploadedWebProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim() || undefined;
  const ticket = String(formData.get("ticket") ?? "");
  const { staged, validated } = verifyStagedUploadTicket(ticket);
  const result = await publishProject({
    projectId,
    title,
    slug,
    summary,
    staged,
    validation: validated,
  });

  revalidatePath("/labs");
  revalidatePath("/admin/web-projects");
  redirect(`/admin/web-projects/${result.projectId}?published=1`);
}

export async function rollbackWebProjectAction(projectId: string) {
  await rollbackProject(projectId);
  revalidatePath("/labs");
  revalidatePath("/admin/web-projects");
  revalidatePath(`/admin/web-projects/${projectId}`);
  redirect(`/admin/web-projects/${projectId}?rolledBack=1`);
}
