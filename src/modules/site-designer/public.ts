import "server-only";

import { revalidatePath } from "next/cache";

import { prisma } from "../../infrastructure/db/prisma";
import { PrismaAppearanceSettingsRepository } from "./adapters/prisma-appearance-settings-repository";
import { PrismaHomeLayoutSettingsRepository } from "./adapters/prisma-home-layout-settings-repository";
import { PrismaPageRepository } from "./adapters/prisma-page-repository";
import { createPageQueryService } from "./application/query-pages";
import {
  createPageTransferPackage,
  MAX_PAGE_IMPORT_BYTES,
  parsePageTransferPackage,
} from "./application/page-transfer";
import { publishPage as publishPageWithRepository } from "./application/publish-page";
import { savePageDraft as savePageDraftWithRepository } from "./application/save-page-draft";
import { updateAppearanceSettings as updateAppearanceWithRepository } from "./application/update-appearance-settings";
import { updateHomeLayoutSettings as updateHomeLayoutWithRepository } from "./application/update-home-layout-settings";
import {
  defaultAppearanceSettings,
  type AppearanceSettingsInput,
} from "./domain/appearance";
import {
  defaultHomeLayoutSettings,
  type HomeLayoutSettingsInput,
} from "./domain/home-layout";
import type { PageDraftInput, PageService } from "./domain/page";

const appearanceRepository = new PrismaAppearanceSettingsRepository(prisma);
const homeLayoutRepository = new PrismaHomeLayoutSettingsRepository(prisma);
const pageRepository = new PrismaPageRepository(prisma);
const clock = { now: () => new Date() };

function revalidatePublicPaths(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/pages");
  if (slug) revalidatePath(`/pages/${slug}`);
}

export async function getAppearanceSettings() {
  return (await appearanceRepository.get()) ?? defaultAppearanceSettings;
}

export async function updateAppearanceSettings(input: AppearanceSettingsInput) {
  const result = await updateAppearanceWithRepository({ repository: appearanceRepository }, input);

  if (result.ok) revalidatePublicPaths();
  return result;
}

export async function resetAppearanceSettings() {
  const settings = await appearanceRepository.save(defaultAppearanceSettings);
  revalidatePublicPaths();
  return settings;
}

export async function getHomeLayoutSettings() {
  return (await homeLayoutRepository.get()) ?? defaultHomeLayoutSettings;
}

export async function updateHomeLayoutSettings(input: HomeLayoutSettingsInput) {
  const result = await updateHomeLayoutWithRepository({ repository: homeLayoutRepository }, input);

  if (result.ok) revalidatePublicPaths();
  return result;
}

export async function resetHomeLayoutSettings() {
  const settings = await homeLayoutRepository.save(defaultHomeLayoutSettings);
  revalidatePublicPaths();
  return settings;
}

export const pageQueries = createPageQueryService({ repository: pageRepository });

export {
  createPageTransferPackage,
  MAX_PAGE_IMPORT_BYTES,
  parsePageTransferPackage,
};

export const pageService: PageService = {
  async saveDraft(input: PageDraftInput) {
    const result = await savePageDraftWithRepository({ repository: pageRepository }, input);

    if (result.ok) revalidatePublicPaths(result.slug);
    return result;
  },
  async publish(id: string) {
    const result = await publishPageWithRepository({ repository: pageRepository, clock }, id);
    revalidatePublicPaths(result.slug);
    return result;
  },
  async unpublish(id: string) {
    const page = await pageRepository.findById(id);
    await pageRepository.unpublish(id);
    revalidatePublicPaths(page?.slug);
  },
  async delete(id: string) {
    const page = await pageRepository.findById(id);
    await pageRepository.delete(id);
    revalidatePublicPaths(page?.slug);
  },
};

export type {
  AppearanceSettings,
  AppearanceSettingsErrorCode,
  AppearanceSettingsErrors,
} from "./domain/appearance";
export type {
  HomeLayoutSettings,
  HomeLayoutSettingsErrorCode,
  HomeLayoutSettingsErrors,
  HomeModule,
  HomeModuleId,
} from "./domain/home-layout";
export type {
  PageAdminSummary,
  PageDraftInput,
  PageEditorRecord,
  PageNavigationItem,
  PageQueryService,
  PageSearchResult,
  PageSaveErrorCode,
  PageSaveErrors,
  PageSaveResult,
  PageService,
  PageStatus,
  StoredPage,
} from "./domain/page";
