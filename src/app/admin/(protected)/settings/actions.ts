"use server";

import { redirect } from "next/navigation";

import {
  type SiteSettingsInput,
  updateSiteSettings,
} from "../../../../modules/site-settings/public";

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()));
}

function parseNavigation(formData: FormData): SiteSettingsInput["navigation"] {
  return parseLines(formData.get("navigation")).map(([label, href]) => ({
    label: label ?? "",
    href: href as SiteSettingsInput["navigation"][number]["href"],
  }));
}

function parseSocialLinks(formData: FormData): SiteSettingsInput["socialLinks"] {
  return parseLines(formData.get("socialLinks")).map(([label, url]) => ({
    label: label ?? "",
    url: url ?? "",
  }));
}

export async function saveSiteSettingsAction(formData: FormData): Promise<void> {
  const result = await updateSiteSettings({
    blogName: String(formData.get("blogName") ?? ""),
    authorName: String(formData.get("authorName") ?? ""),
    authorBio: String(formData.get("authorBio") ?? ""),
    homeTitle: String(formData.get("homeTitle") ?? ""),
    homeDescription: String(formData.get("homeDescription") ?? ""),
    avatarMediaId: null,
    navigation: parseNavigation(formData),
    socialLinks: parseSocialLinks(formData),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
  });

  if (!result.ok) {
    const params = new URLSearchParams();
    for (const [field, code] of Object.entries(result.errors)) {
      if (code) params.set(field, code);
    }
    redirect(`/admin/settings?${params.toString()}`);
  }

  redirect("/admin/settings?saved=1");
}
