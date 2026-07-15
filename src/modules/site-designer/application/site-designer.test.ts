import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../../../infrastructure/time/clock";
import {
  defaultAppearanceSettings,
  type AppearanceSettings,
} from "../domain/appearance";
import {
  createDefaultHomeModules,
  defaultHomeLayoutSettings,
  parseStoredHomeModules,
  type HomeLayoutSettings,
} from "../domain/home-layout";
import { resolveHomeGridPlacement } from "../domain/home-grid";
import type { StoredPage } from "../domain/page";
import type { AppearanceSettingsRepository } from "../ports/appearance-settings-repository";
import type { HomeLayoutSettingsRepository } from "../ports/home-layout-settings-repository";
import type { PageRepository, SavePageDraftRecord } from "../ports/page-repository";
import { publishPage } from "./publish-page";
import { createPageTransferPackage, parsePageTransferPackage } from "./page-transfer";
import { savePageDraft } from "./save-page-draft";
import { updateAppearanceSettings } from "./update-appearance-settings";
import { updateHomeLayoutSettings } from "./update-home-layout-settings";

const NOW = new Date("2026-07-12T10:00:00.000Z");
const clock: Clock = { now: () => NOW };

function createAppearanceRepository(): AppearanceSettingsRepository {
  return {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (settings: AppearanceSettings) => settings),
  };
}

function createHomeLayoutRepository(): HomeLayoutSettingsRepository {
  return {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (settings: HomeLayoutSettings) => settings),
  };
}

class InMemoryPageRepository implements PageRepository {
  pages = new Map<string, StoredPage>();
  nextId = 1;

  async findIdBySlug(slug: string) {
    return Array.from(this.pages.values()).find((page) => page.slug === slug)?.id ?? null;
  }

  async saveDraft(input: SavePageDraftRecord) {
    const id = input.id ?? `page-${this.nextId++}`;
    const existing = this.pages.get(id);
    this.pages.set(id, {
      id,
      ...input,
      status: existing?.status ?? "DRAFT",
      publishedAt: existing?.publishedAt ?? null,
    });
    return { id, slug: input.slug };
  }

  async findById(id: string) {
    return this.pages.get(id) ?? null;
  }

  async publish(id: string, publishedAt: Date) {
    const page = this.pages.get(id);
    if (!page) throw new Error("Page not found");
    this.pages.set(id, { ...page, status: "PUBLISHED", publishedAt });
    return { slug: page.slug, publishedAt };
  }

  async unpublish(id: string) {
    const page = this.pages.get(id);
    if (!page) throw new Error("Page not found");
    this.pages.set(id, { ...page, status: "DRAFT", publishedAt: null });
  }

  async delete(id: string) {
    this.pages.delete(id);
  }

  async findPublishedBySlug(slug: string) {
    return (
      Array.from(this.pages.values()).find(
        (page) => page.slug === slug && page.status === "PUBLISHED",
      ) ?? null
    );
  }

  async searchPublished(query: string) {
    const normalizedQuery = query.toLocaleLowerCase();
    return Array.from(this.pages.values())
      .filter(
        (page) =>
          page.status === "PUBLISHED" &&
          `${page.title} ${page.summary}`.toLocaleLowerCase().includes(normalizedQuery),
      )
      .map(({ id, title, slug, summary }) => ({ id, title, slug, summary }));
  }

  async listForNavigation() {
    return Array.from(this.pages.values())
      .filter((page) => page.status === "PUBLISHED" && page.showInNavigation)
      .map(({ title, slug }) => ({ title, slug }));
  }

  async listForAdmin() {
    return Array.from(this.pages.values()).map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      status: page.status,
      showInNavigation: page.showInNavigation,
      updatedAt: NOW,
      publishedAt: page.publishedAt,
    }));
  }

  async findForEditor(id: string) {
    const page = this.pages.get(id);
    return page ? { ...page, updatedAt: NOW } : null;
  }
}

const basePageDraft = {
  title: "关于博客",
  slug: "",
  summary: "记录技术教程与实验项目。",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "你好" }] }] },
  coverMediaId: null,
  showInNavigation: true,
  seoTitle: "关于博客",
  seoDescription: "关于这个博客。",
};

describe("site designer settings", () => {
  it("rejects appearance options outside the controlled set", async () => {
    const repository = createAppearanceRepository();

    const result = await updateAppearanceSettings(
      { repository },
      { ...defaultAppearanceSettings, accentPreset: "unsafe" as never },
    );

    expect(result).toEqual({ ok: false, errors: { accentPreset: "APPEARANCE_OPTION_INVALID" } });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("keeps every homepage module unique and known", async () => {
    const repository = createHomeLayoutRepository();
    const modules = createDefaultHomeModules();
    modules[1] = { id: "hero", enabled: true, layout: { ...modules[1]!.layout } };

    const result = await updateHomeLayoutSettings(
      { repository },
      { ...defaultHomeLayoutSettings, modules },
    );

    expect(result).toEqual({ ok: false, errors: { modules: "HOME_MODULES_INVALID" } });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("adds a safe full-width layout to legacy homepage modules", () => {
    const legacyModules = createDefaultHomeModules().map(({ enabled, id }) => ({ enabled, id }));

    expect(parseStoredHomeModules(legacyModules)).toEqual(createDefaultHomeModules());
  });

  it("migrates semantic legacy heights to real grid row spans", () => {
    const legacyModules = createDefaultHomeModules().map((module) => ({
      id: module.id,
      enabled: module.enabled,
      layout: {
        desktopSpan: module.layout.desktopSpan,
        height: "spacious",
        breakBefore: module.layout.breakBefore,
      },
    }));

    expect(parseStoredHomeModules(legacyModules)[0]?.layout).toEqual({
      desktopSpan: "full",
      rowSpan: 3,
      breakBefore: false,
    });
  });

  it("rejects homepage modules with an unsupported grid span", async () => {
    const repository = createHomeLayoutRepository();
    const modules = createDefaultHomeModules();
    modules[0] = {
      ...modules[0]!,
      layout: { ...modules[0]!.layout, desktopSpan: "unsafe" as never },
    };

    const result = await updateHomeLayoutSettings(
      { repository },
      { ...defaultHomeLayoutSettings, modules },
    );

    expect(result).toEqual({ ok: false, errors: { modules: "HOME_MODULES_INVALID" } });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("rejects homepage modules with an unsupported grid row span", async () => {
    const repository = createHomeLayoutRepository();
    const modules = createDefaultHomeModules();
    modules[0] = {
      ...modules[0]!,
      layout: { ...modules[0]!.layout, rowSpan: 5 as never },
    };

    const result = await updateHomeLayoutSettings(
      { repository },
      { ...defaultHomeLayoutSettings, modules },
    );

    expect(result).toEqual({ ok: false, errors: { modules: "HOME_MODULES_INVALID" } });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("resolves a narrow four-row module consistently for every viewport", () => {
    const layout = { desktopSpan: "narrow" as const, rowSpan: 4 as const, breakBefore: false };

    expect(resolveHomeGridPlacement(layout, "desktop")).toEqual({
      columnSpan: 4,
      columnStart: "auto",
      rowSpan: 4,
    });
    expect(resolveHomeGridPlacement(layout, "tablet")).toEqual({
      columnSpan: 1,
      columnStart: "auto",
      rowSpan: 4,
    });
    expect(resolveHomeGridPlacement(layout, "mobile")).toEqual({
      columnSpan: 1,
      columnStart: 1,
      rowSpan: 1,
    });
  });
});

describe("page workflow", () => {
  it("round-trips a page package as an unpublished, media-independent draft", () => {
    const exported = createPageTransferPackage({
      id: "page-transfer",
      ...basePageDraft,
      status: "PUBLISHED",
      publishedAt: NOW,
      updatedAt: NOW,
    });

    expect(parsePageTransferPackage(JSON.parse(JSON.stringify(exported)))).toEqual(basePageDraft);
  });

  it("rejects malformed page packages", () => {
    expect(parsePageTransferPackage({ format: "yourblog-page", version: 2 })).toBeNull();
    expect(parsePageTransferPackage({ format: "other", version: 1, page: {} })).toBeNull();
  });

  it("creates a stable URL for a Chinese-only page title", async () => {
    const repository = new InMemoryPageRepository();

    const result = await savePageDraft({ repository }, basePageDraft);

    expect(result).toMatchObject({ ok: true, slug: expect.stringMatching(/^page-[a-f0-9]{8}$/) });
  });

  it("rejects a reserved page URL and duplicate URL", async () => {
    const repository = new InMemoryPageRepository();
    await savePageDraft({ repository }, { ...basePageDraft, title: "About", slug: "company" });

    await expect(savePageDraft({ repository }, { ...basePageDraft, slug: "admin" })).resolves.toEqual({
      ok: false,
      errors: { slug: "PAGE_SLUG_RESERVED" },
    });
    await expect(
      savePageDraft({ repository }, { ...basePageDraft, title: "Another", slug: "company" }),
    ).resolves.toEqual({ ok: false, errors: { slug: "PAGE_SLUG_TAKEN" } });
  });

  it("does not publish an empty editor document", async () => {
    const repository = new InMemoryPageRepository();
    const saved = await savePageDraft({
      repository,
    }, { ...basePageDraft, content: { type: "doc", content: [{ type: "paragraph" }] } });
    if (!saved.ok) throw new Error("Expected draft to be saved");

    await expect(publishPage({ repository, clock }, saved.id)).rejects.toMatchObject({
      code: "PAGE_NOT_READY",
    });
  });

  it("publishes a completed page and exposes it in navigation", async () => {
    const repository = new InMemoryPageRepository();
    const saved = await savePageDraft({ repository }, { ...basePageDraft, title: "About", slug: "about-blog" });
    if (!saved.ok) throw new Error("Expected draft to be saved");

    await expect(publishPage({ repository, clock }, saved.id)).resolves.toEqual({
      slug: "about-blog",
      publishedAt: NOW,
    });
    await expect(repository.findPublishedBySlug("about-blog")).resolves.toMatchObject({
      status: "PUBLISHED",
    });
    await expect(repository.listForNavigation()).resolves.toEqual([{ title: "About", slug: "about-blog" }]);
  });
});
