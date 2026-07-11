import type { PrismaClient } from "../../../generated/prisma/client";
import type {
  SiteNavigationItem,
  SiteSettings,
  SocialLink,
} from "../domain/site-settings";
import type { SiteSettingsRepository } from "../ports/site-settings-repository";

type StoredSiteSettings = {
  blogName: string;
  authorName: string;
  authorBio: string;
  homeTitle: string;
  homeDescription: string;
  avatarMediaId: string | null;
  navigation: unknown;
  socialLinks: unknown;
  seoTitle: string;
  seoDescription: string;
};

function parseNavigation(value: unknown): SiteNavigationItem[] {
  return Array.isArray(value) ? (value as SiteNavigationItem[]) : [];
}

function parseSocialLinks(value: unknown): SocialLink[] {
  return Array.isArray(value) ? (value as SocialLink[]) : [];
}

function toDomain(row: StoredSiteSettings): SiteSettings {
  return {
    blogName: row.blogName,
    authorName: row.authorName,
    authorBio: row.authorBio,
    homeTitle: row.homeTitle,
    homeDescription: row.homeDescription,
    avatarMediaId: row.avatarMediaId,
    navigation: parseNavigation(row.navigation),
    socialLinks: parseSocialLinks(row.socialLinks),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

export class PrismaSiteSettingsRepository implements SiteSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<SiteSettings | null> {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: "site" },
    });

    return settings ? toDomain(settings) : null;
  }

  async save(settings: SiteSettings): Promise<SiteSettings> {
    const saved = await this.prisma.siteSettings.upsert({
      where: { id: "site" },
      create: { id: "site", ...settings },
      update: settings,
    });

    return toDomain(saved);
  }
}
