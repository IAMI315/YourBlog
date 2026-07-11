import "server-only";

import { prisma } from "../../infrastructure/db/prisma";
import type { SiteSettings, SiteSettingsInput } from "./domain/site-settings";
import { updateSiteSettings as updateWithRepository } from "./application/update-site-settings";
import { PrismaSiteSettingsRepository } from "./adapters/prisma-site-settings-repository";

export const defaultSiteSettings: SiteSettings = {
  blogName: "YourBlog",
  authorName: "Admin",
  authorBio: "Personal technology tutorials and notes.",
  homeTitle: "YourBlog",
  homeDescription: "A practical notebook for technology tutorials, labs, and engineering notes.",
  avatarMediaId: null,
  navigation: [
    { label: "Home", href: "/" },
    { label: "Tutorials", href: "/tutorials" },
    { label: "Labs", href: "/labs" },
    { label: "Archive", href: "/archive" },
    { label: "About", href: "/about" },
  ],
  socialLinks: [],
  seoTitle: "YourBlog",
  seoDescription: "Personal technology tutorials and notes.",
};

const repository = new PrismaSiteSettingsRepository(prisma);

export async function getSiteSettings(): Promise<SiteSettings> {
  return (await repository.get()) ?? defaultSiteSettings;
}

export async function updateSiteSettings(input: SiteSettingsInput) {
  return updateWithRepository({ repository }, input);
}

export type { SiteSettings, SiteSettingsInput };
