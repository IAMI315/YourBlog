import {
  type HomeLayoutSettings,
  type HomeLayoutSettingsErrors,
  type HomeLayoutSettingsInput,
  normalizeHomeLayoutSettings,
  validateHomeLayoutSettings,
} from "../domain/home-layout";
import type { HomeLayoutSettingsRepository } from "../ports/home-layout-settings-repository";

type UpdateHomeLayoutSettingsDependencies = {
  repository: HomeLayoutSettingsRepository;
};

export type UpdateHomeLayoutSettingsResult =
  | { ok: true; settings: HomeLayoutSettings }
  | { ok: false; errors: HomeLayoutSettingsErrors };

export async function updateHomeLayoutSettings(
  { repository }: UpdateHomeLayoutSettingsDependencies,
  input: HomeLayoutSettingsInput,
): Promise<UpdateHomeLayoutSettingsResult> {
  const settings = normalizeHomeLayoutSettings(input);
  const errors = validateHomeLayoutSettings(settings);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, settings: await repository.save(settings) };
}
