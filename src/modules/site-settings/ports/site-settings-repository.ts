import type { SiteSettings } from "../domain/site-settings";

export interface SiteSettingsRepository {
  get(): Promise<SiteSettings | null>;
  save(settings: SiteSettings): Promise<SiteSettings>;
}
