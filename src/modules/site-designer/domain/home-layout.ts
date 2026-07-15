import {
  isHomeGridRowSpan,
  rowSpanFromLegacyHeight,
  type HomeGridRowSpan,
} from "./home-grid";

export const HOME_MODULE_IDS = ["hero", "featured", "recent", "labs", "archive"] as const;
export const HOME_DESKTOP_SPANS = ["full", "wide", "half", "narrow"] as const;

export type HomeModuleId = (typeof HOME_MODULE_IDS)[number];
export type HomeDesktopSpan = (typeof HOME_DESKTOP_SPANS)[number];

export type HomeModuleLayout = {
  desktopSpan: HomeDesktopSpan;
  rowSpan: HomeGridRowSpan;
  breakBefore: boolean;
};

export type HomeModule = {
  id: HomeModuleId;
  enabled: boolean;
  layout: HomeModuleLayout;
};

export type HomeLayoutSettingsInput = {
  modules: HomeModule[];
  heroTitle: string | null;
  heroDescription: string | null;
  featuredLabel: string;
  labLabel: string;
  labTitle: string;
  labDescription: string;
  archiveLabel: string;
  recentArticlesCount: number;
};

export type HomeLayoutSettings = HomeLayoutSettingsInput;

export type HomeLayoutSettingsErrorCode =
  | "HOME_MODULES_INVALID"
  | "HOME_TEXT_TOO_LONG"
  | "HOME_LABEL_REQUIRED"
  | "RECENT_ARTICLES_COUNT_INVALID";

export type HomeLayoutSettingsErrors = Partial<
  Record<keyof HomeLayoutSettingsInput, HomeLayoutSettingsErrorCode>
>;

export const defaultHomeModuleLayout: HomeModuleLayout = {
  desktopSpan: "full",
  rowSpan: 1,
  breakBefore: false,
};

const defaultModules: readonly HomeModule[] = HOME_MODULE_IDS.map((id) => ({
  id,
  enabled: true,
  layout: { ...defaultHomeModuleLayout },
}));

export const defaultHomeLayoutSettings: HomeLayoutSettings = {
  modules: defaultModules.map((module) => ({ ...module })),
  heroTitle: null,
  heroDescription: null,
  featuredLabel: "精选教程",
  labLabel: "网页实验室",
  labTitle: "把网页项目发布到独立实验室空间",
  labDescription: "上传 HTML/ZIP 后，后续会通过隔离域名展示。",
  archiveLabel: "教程归档",
  recentArticlesCount: 4,
};

export function createDefaultHomeModules(): HomeModule[] {
  return defaultModules.map((module) => ({ ...module, layout: { ...module.layout } }));
}

function hasOption<Value extends string>(options: readonly Value[], value: unknown): value is Value {
  return typeof value === "string" && options.includes(value as Value);
}

export function isValidHomeModuleLayout(value: unknown): value is HomeModuleLayout {
  if (!value || typeof value !== "object") return false;

  const layout = value as Record<string, unknown>;

  return (
    hasOption(HOME_DESKTOP_SPANS, layout.desktopSpan) &&
    isHomeGridRowSpan(layout.rowSpan) &&
    typeof layout.breakBefore === "boolean"
  );
}

function hasValidModuleIdentity(value: unknown): value is { id: HomeModuleId; enabled: boolean } {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    hasOption(HOME_MODULE_IDS, candidate.id) &&
    typeof candidate.enabled === "boolean"
  );
}

export function isValidHomeModules(value: unknown): value is HomeModule[] {
  if (!Array.isArray(value) || value.length !== HOME_MODULE_IDS.length) return false;

  const seen = new Set<string>();

  return value.every((candidate) => {
    const layout = candidate && typeof candidate === "object"
      ? (candidate as Record<string, unknown>).layout
      : undefined;

    if (!hasValidModuleIdentity(candidate) || !isValidHomeModuleLayout(layout) || seen.has(candidate.id)) {
      return false;
    }

    seen.add(candidate.id);
    return true;
  });
}

export function parseStoredHomeModules(value: unknown): HomeModule[] {
  if (!Array.isArray(value) || value.length !== HOME_MODULE_IDS.length) {
    return createDefaultHomeModules();
  }

  const seen = new Set<string>();
  const modules: HomeModule[] = [];

  for (const candidate of value) {
    if (!hasValidModuleIdentity(candidate) || seen.has(candidate.id)) {
      return createDefaultHomeModules();
    }

    const rawLayout = (candidate as Record<string, unknown>).layout;
    const layout = normalizeStoredHomeModuleLayout(rawLayout);

    if (!layout) return createDefaultHomeModules();

    seen.add(candidate.id);
    modules.push({ id: candidate.id, enabled: candidate.enabled, layout });
  }

  return modules;
}

function normalizeStoredHomeModuleLayout(value: unknown): HomeModuleLayout | null {
  if (value === undefined) return { ...defaultHomeModuleLayout };
  if (!value || typeof value !== "object") return null;

  const layout = value as Record<string, unknown>;
  if (!hasOption(HOME_DESKTOP_SPANS, layout.desktopSpan) || typeof layout.breakBefore !== "boolean") {
    return null;
  }

  const rowSpan = isHomeGridRowSpan(layout.rowSpan)
    ? layout.rowSpan
    : rowSpanFromLegacyHeight(layout.height);

  return rowSpan
    ? { desktopSpan: layout.desktopSpan, rowSpan, breakBefore: layout.breakBefore }
    : null;
}

function hasTooLongText(value: string | null, maximumLength: number): boolean {
  return value !== null && value.trim().length > maximumLength;
}

export function validateHomeLayoutSettings(
  input: HomeLayoutSettingsInput,
): HomeLayoutSettingsErrors {
  const errors: HomeLayoutSettingsErrors = {};

  if (!isValidHomeModules(input.modules)) {
    errors.modules = "HOME_MODULES_INVALID";
  }

  if (hasTooLongText(input.heroTitle, 160)) {
    errors.heroTitle = "HOME_TEXT_TOO_LONG";
  }

  if (hasTooLongText(input.heroDescription, 360)) {
    errors.heroDescription = "HOME_TEXT_TOO_LONG";
  }

  const labels: Array<keyof Pick<
    HomeLayoutSettingsInput,
    "featuredLabel" | "labLabel" | "labTitle" | "labDescription" | "archiveLabel"
  >> = ["featuredLabel", "labLabel", "labTitle", "labDescription", "archiveLabel"];

  for (const field of labels) {
    const value = input[field].trim();

    if (!value) {
      errors[field] = "HOME_LABEL_REQUIRED";
    } else if (value.length > 240) {
      errors[field] = "HOME_TEXT_TOO_LONG";
    }
  }

  if (
    !Number.isInteger(input.recentArticlesCount) ||
    input.recentArticlesCount < 1 ||
    input.recentArticlesCount > 12
  ) {
    errors.recentArticlesCount = "RECENT_ARTICLES_COUNT_INVALID";
  }

  return errors;
}

export function normalizeHomeLayoutSettings(input: HomeLayoutSettingsInput): HomeLayoutSettings {
  return {
    ...input,
    modules: input.modules.map((module) => ({ ...module, layout: { ...module.layout } })),
    heroTitle: input.heroTitle?.trim() || null,
    heroDescription: input.heroDescription?.trim() || null,
    featuredLabel: input.featuredLabel.trim(),
    labLabel: input.labLabel.trim(),
    labTitle: input.labTitle.trim(),
    labDescription: input.labDescription.trim(),
    archiveLabel: input.archiveLabel.trim(),
  };
}
