export const APPROVED_NAVIGATION_HREFS = [
  "/",
  "/tutorials",
  "/labs",
  "/archive",
  "/about",
] as const;

export type NavigationHref = (typeof APPROVED_NAVIGATION_HREFS)[number];

export type SiteNavigationItem = {
  label: string;
  href: NavigationHref;
};

export type SocialLink = {
  label: string;
  url: string;
};

export type SiteSettingsInput = {
  blogName: string;
  authorName: string;
  authorBio: string;
  homeTitle: string;
  homeDescription: string;
  avatarMediaId: string | null;
  navigation: SiteNavigationItem[];
  socialLinks: SocialLink[];
  seoTitle: string;
  seoDescription: string;
};

export type SiteSettings = SiteSettingsInput;

export type SiteSettingsErrorCode =
  | "BLOG_NAME_REQUIRED"
  | "SOCIAL_LINK_HTTPS_REQUIRED"
  | "NAVIGATION_ROUTE_NOT_ALLOWED";

export type SiteSettingsErrors = Partial<{
  blogName: SiteSettingsErrorCode;
  socialLinks: SiteSettingsErrorCode;
  navigation: SiteSettingsErrorCode;
}>;
