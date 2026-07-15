import type { HomeLayoutSettings } from "../domain/home-layout";

export interface HomeLayoutSettingsRepository {
  get(): Promise<HomeLayoutSettings | null>;
  save(settings: HomeLayoutSettings): Promise<HomeLayoutSettings>;
}
