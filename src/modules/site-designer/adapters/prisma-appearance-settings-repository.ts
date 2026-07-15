import type { PrismaClient } from "../../../generated/prisma/client";
import {
  APPEARANCE_OPTIONS,
  defaultAppearanceSettings,
  type AppearanceSettings,
} from "../domain/appearance";
import type { AppearanceSettingsRepository } from "../ports/appearance-settings-repository";

type StoredAppearanceSettings = {
  themePreset: string;
  accentPreset: string;
  backgroundTone: string;
  glassIntensity: string;
  radiusScale: string;
  buttonStyle: string;
  headerDensity: string;
  footerVisible: boolean;
};

function optionOrDefault<Value extends string>(
  value: string,
  options: readonly Value[],
  fallback: Value,
): Value {
  return options.includes(value as Value) ? (value as Value) : fallback;
}

function toDomain(row: StoredAppearanceSettings): AppearanceSettings {
  return {
    themePreset: optionOrDefault(
      row.themePreset,
      APPEARANCE_OPTIONS.themePreset,
      defaultAppearanceSettings.themePreset,
    ),
    accentPreset: optionOrDefault(
      row.accentPreset,
      APPEARANCE_OPTIONS.accentPreset,
      defaultAppearanceSettings.accentPreset,
    ),
    backgroundTone: optionOrDefault(
      row.backgroundTone,
      APPEARANCE_OPTIONS.backgroundTone,
      defaultAppearanceSettings.backgroundTone,
    ),
    glassIntensity: optionOrDefault(
      row.glassIntensity,
      APPEARANCE_OPTIONS.glassIntensity,
      defaultAppearanceSettings.glassIntensity,
    ),
    radiusScale: optionOrDefault(
      row.radiusScale,
      APPEARANCE_OPTIONS.radiusScale,
      defaultAppearanceSettings.radiusScale,
    ),
    buttonStyle: optionOrDefault(
      row.buttonStyle,
      APPEARANCE_OPTIONS.buttonStyle,
      defaultAppearanceSettings.buttonStyle,
    ),
    headerDensity: optionOrDefault(
      row.headerDensity,
      APPEARANCE_OPTIONS.headerDensity,
      defaultAppearanceSettings.headerDensity,
    ),
    footerVisible: row.footerVisible,
  };
}

export class PrismaAppearanceSettingsRepository implements AppearanceSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<AppearanceSettings | null> {
    const settings = await this.prisma.appearanceSettings.findUnique({ where: { id: "appearance" } });

    return settings ? toDomain(settings) : null;
  }

  async save(settings: AppearanceSettings): Promise<AppearanceSettings> {
    const saved = await this.prisma.appearanceSettings.upsert({
      where: { id: "appearance" },
      create: { id: "appearance", ...settings },
      update: settings,
    });

    return toDomain(saved);
  }
}
