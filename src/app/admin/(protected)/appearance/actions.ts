"use server";

import { redirect } from "next/navigation";

import {
  resetAppearanceSettings,
  resetHomeLayoutSettings,
  updateAppearanceSettings,
  updateHomeLayoutSettings,
  type HomeModule,
} from "../../../../modules/site-designer/public";

function appearanceInput(formData: FormData) {
  return {
    themePreset: String(formData.get("themePreset") ?? "") as never,
    accentPreset: String(formData.get("accentPreset") ?? "") as never,
    backgroundTone: String(formData.get("backgroundTone") ?? "") as never,
    glassIntensity: String(formData.get("glassIntensity") ?? "") as never,
    radiusScale: String(formData.get("radiusScale") ?? "") as never,
    buttonStyle: String(formData.get("buttonStyle") ?? "") as never,
    headerDensity: String(formData.get("headerDensity") ?? "") as never,
    footerVisible: formData.get("footerVisible") === "on",
  };
}

function parseModules(value: FormDataEntryValue | null): HomeModule[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? (parsed as HomeModule[]) : [];
  } catch {
    return [];
  }
}

export async function saveAppearanceAction(formData: FormData): Promise<void> {
  const result = await updateAppearanceSettings(appearanceInput(formData));

  redirect(result.ok ? "/admin/appearance/global?saved=1" : "/admin/appearance/global?error=invalid");
}

export async function resetAppearanceAction(): Promise<void> {
  await resetAppearanceSettings();
  redirect("/admin/appearance/global?reset=1");
}

export async function saveHomeLayoutAction(formData: FormData): Promise<void> {
  const result = await updateHomeLayoutSettings({
    modules: parseModules(formData.get("modules")),
    heroTitle: String(formData.get("heroTitle") ?? "").trim() || null,
    heroDescription: String(formData.get("heroDescription") ?? "").trim() || null,
    featuredLabel: String(formData.get("featuredLabel") ?? ""),
    labLabel: String(formData.get("labLabel") ?? ""),
    labTitle: String(formData.get("labTitle") ?? ""),
    labDescription: String(formData.get("labDescription") ?? ""),
    archiveLabel: String(formData.get("archiveLabel") ?? ""),
    recentArticlesCount: Number(formData.get("recentArticlesCount")),
  });

  redirect(result.ok ? "/admin/appearance/home?saved=1" : "/admin/appearance/home?error=invalid");
}

export async function resetHomeLayoutAction(): Promise<void> {
  await resetHomeLayoutSettings();
  redirect("/admin/appearance/home?reset=1");
}
