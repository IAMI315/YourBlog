import { describe, expect, it, vi } from "vitest";

import type { SiteSettings } from "../domain/site-settings";
import type { SiteSettingsRepository } from "../ports/site-settings-repository";
import { updateSiteSettings } from "./update-site-settings";

const validInput = {
  blogName: "技术笔记",
  authorName: "作者",
  authorBio: "记录工程实践与科技教程。",
  homeTitle: "技术笔记",
  homeDescription: "面向实践的科技教程。",
  avatarMediaId: null,
  navigation: [
    { label: "首页", href: "/" as const },
    { label: "教程", href: "/tutorials" as const },
  ],
  socialLinks: [{ label: "GitHub", url: "https://github.com/example" }],
  seoTitle: "技术笔记",
  seoDescription: "个人科技教程与笔记。",
};

function createRepository(): SiteSettingsRepository {
  return {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (settings: SiteSettings) => settings),
  };
}

describe("updateSiteSettings", () => {
  it("round-trips Chinese values through the repository", async () => {
    const repository = createRepository();

    const result = await updateSiteSettings({ repository }, validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected settings update to succeed");
    expect(result.settings.blogName).toBe("技术笔记");
    expect(result.settings.navigation[0]).toEqual({ label: "首页", href: "/" });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(validInput));
  });

  it("rejects an empty blog name", async () => {
    const repository = createRepository();

    const result = await updateSiteSettings({ repository }, { ...validInput, blogName: "  " });

    expect(result).toEqual({
      ok: false,
      errors: { blogName: "BLOG_NAME_REQUIRED" },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("requires external social links to use HTTPS", async () => {
    const repository = createRepository();

    const result = await updateSiteSettings(
      { repository },
      { ...validInput, socialLinks: [{ label: "Blog", url: "http://example.com" }] },
    );

    expect(result).toEqual({
      ok: false,
      errors: { socialLinks: "SOCIAL_LINK_HTTPS_REQUIRED" },
    });
  });

  it("accepts navigation items only from the approved internal routes", async () => {
    const repository = createRepository();

    const result = await updateSiteSettings(
      { repository },
      { ...validInput, navigation: [{ label: "Admin", href: "/admin" }] as never },
    );

    expect(result).toEqual({
      ok: false,
      errors: { navigation: "NAVIGATION_ROUTE_NOT_ALLOWED" },
    });
  });
});
