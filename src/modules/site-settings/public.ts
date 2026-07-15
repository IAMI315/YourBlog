import "server-only";

import { prisma } from "../../infrastructure/db/prisma";
import type { SiteSettings, SiteSettingsInput } from "./domain/site-settings";
import { updateSiteSettings as updateWithRepository } from "./application/update-site-settings";
import { PrismaSiteSettingsRepository } from "./adapters/prisma-site-settings-repository";

export const defaultSiteSettings: SiteSettings = {
  blogName: "YourBlog",
  authorName: "管理员",
  authorBio: "记录个人科技教程、工程笔记与实验项目。",
  homeTitle: "YourBlog",
  homeDescription: "一个用于沉淀科技教程、实验项目和工程笔记的个人博客。",
  avatarMediaId: null,
  navigation: [
    { label: "首页", href: "/" },
    { label: "教程", href: "/tutorials" },
    { label: "实验室", href: "/labs" },
    { label: "归档", href: "/archive" },
    { label: "关于", href: "/about" },
  ],
  socialLinks: [],
  seoTitle: "YourBlog",
  seoDescription: "个人科技教程、工程笔记与实验项目。",
};

const repository = new PrismaSiteSettingsRepository(prisma);

const defaultNavigationLabelByHref = new Map(
  defaultSiteSettings.navigation.map((item) => [item.href, item.label]),
);

function localizeKnownDefaultSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    authorName: settings.authorName === "Admin" ? defaultSiteSettings.authorName : settings.authorName,
    authorBio:
      settings.authorBio === "Personal technology tutorials and notes."
        ? defaultSiteSettings.authorBio
        : settings.authorBio,
    homeDescription:
      settings.homeDescription === "A practical notebook for technology tutorials, labs, and engineering notes."
        ? defaultSiteSettings.homeDescription
        : settings.homeDescription,
    navigation: settings.navigation.map((item) => ({
      ...item,
      label: defaultNavigationLabelByHref.get(item.href) ?? item.label,
    })),
    seoDescription:
      settings.seoDescription === "Personal technology tutorials and notes."
        ? defaultSiteSettings.seoDescription
        : settings.seoDescription,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return localizeKnownDefaultSettings((await repository.get()) ?? defaultSiteSettings);
}

export async function updateSiteSettings(input: SiteSettingsInput) {
  return updateWithRepository({ repository }, input);
}

export type { SiteSettings, SiteSettingsInput };
