import type { AppearanceSettings } from "../domain/appearance";

export interface AppearanceSettingsRepository {
  get(): Promise<AppearanceSettings | null>;
  save(settings: AppearanceSettings): Promise<AppearanceSettings>;
}
