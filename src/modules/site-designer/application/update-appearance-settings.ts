import {
  type AppearanceSettings,
  type AppearanceSettingsErrors,
  type AppearanceSettingsInput,
  validateAppearanceSettings,
} from "../domain/appearance";
import type { AppearanceSettingsRepository } from "../ports/appearance-settings-repository";

type UpdateAppearanceSettingsDependencies = {
  repository: AppearanceSettingsRepository;
};

export type UpdateAppearanceSettingsResult =
  | { ok: true; settings: AppearanceSettings }
  | { ok: false; errors: AppearanceSettingsErrors };

export async function updateAppearanceSettings(
  { repository }: UpdateAppearanceSettingsDependencies,
  input: AppearanceSettingsInput,
): Promise<UpdateAppearanceSettingsResult> {
  const errors = validateAppearanceSettings(input);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, settings: await repository.save(input) };
}
