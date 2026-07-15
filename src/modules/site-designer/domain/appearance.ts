export const APPEARANCE_OPTIONS = {
  themePreset: ["aurora", "clarity"] as const,
  accentPreset: ["sky", "mint", "rose"] as const,
  backgroundTone: ["mist", "dawn", "night"] as const,
  glassIntensity: ["subtle", "balanced", "vivid"] as const,
  radiusScale: ["compact", "regular", "relaxed"] as const,
  buttonStyle: ["soft", "tint"] as const,
  headerDensity: ["compact", "standard", "spacious"] as const,
};

export type AppearanceSettingsInput = {
  themePreset: (typeof APPEARANCE_OPTIONS.themePreset)[number];
  accentPreset: (typeof APPEARANCE_OPTIONS.accentPreset)[number];
  backgroundTone: (typeof APPEARANCE_OPTIONS.backgroundTone)[number];
  glassIntensity: (typeof APPEARANCE_OPTIONS.glassIntensity)[number];
  radiusScale: (typeof APPEARANCE_OPTIONS.radiusScale)[number];
  buttonStyle: (typeof APPEARANCE_OPTIONS.buttonStyle)[number];
  headerDensity: (typeof APPEARANCE_OPTIONS.headerDensity)[number];
  footerVisible: boolean;
};

export type AppearanceSettings = AppearanceSettingsInput;

export type AppearanceSettingsErrorCode = "APPEARANCE_OPTION_INVALID";

export type AppearanceSettingsErrors = Partial<
  Record<keyof AppearanceSettingsInput, AppearanceSettingsErrorCode>
>;

export const defaultAppearanceSettings: AppearanceSettings = {
  themePreset: "aurora",
  accentPreset: "sky",
  backgroundTone: "mist",
  glassIntensity: "balanced",
  radiusScale: "regular",
  buttonStyle: "soft",
  headerDensity: "standard",
  footerVisible: true,
};

function hasOption<Value extends string>(options: readonly Value[], value: unknown): value is Value {
  return typeof value === "string" && options.includes(value as Value);
}

export function validateAppearanceSettings(input: AppearanceSettingsInput): AppearanceSettingsErrors {
  const errors: AppearanceSettingsErrors = {};

  for (const [field, options] of Object.entries(APPEARANCE_OPTIONS)) {
    const value = input[field as keyof typeof APPEARANCE_OPTIONS];

    if (!hasOption(options, value)) {
      errors[field as keyof AppearanceSettingsInput] = "APPEARANCE_OPTION_INVALID";
    }
  }

  if (typeof input.footerVisible !== "boolean") {
    errors.footerVisible = "APPEARANCE_OPTION_INVALID";
  }

  return errors;
}
