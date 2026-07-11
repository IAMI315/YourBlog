import {
  APPROVED_NAVIGATION_HREFS,
  type SiteSettings,
  type SiteSettingsErrors,
  type SiteSettingsInput,
} from "../domain/site-settings";
import type { SiteSettingsRepository } from "../ports/site-settings-repository";

type UpdateDependencies = {
  repository: SiteSettingsRepository;
};

export type UpdateSiteSettingsResult =
  | { ok: true; settings: SiteSettings }
  | { ok: false; errors: SiteSettingsErrors };

const approvedHrefs = new Set<string>(APPROVED_NAVIGATION_HREFS);

export function validateSiteSettings(input: SiteSettingsInput): SiteSettingsErrors {
  const errors: SiteSettingsErrors = {};

  if (!input.blogName.trim()) {
    errors.blogName = "BLOG_NAME_REQUIRED";
  }

  if (input.socialLinks.some((link) => !link.url.startsWith("https://"))) {
    errors.socialLinks = "SOCIAL_LINK_HTTPS_REQUIRED";
  }

  if (input.navigation.some((item) => !approvedHrefs.has(item.href))) {
    errors.navigation = "NAVIGATION_ROUTE_NOT_ALLOWED";
  }

  return errors;
}

export async function updateSiteSettings(
  { repository }: UpdateDependencies,
  input: SiteSettingsInput,
): Promise<UpdateSiteSettingsResult> {
  const settings: SiteSettings = {
    ...input,
    blogName: input.blogName.trim(),
    authorName: input.authorName.trim(),
    seoTitle: input.seoTitle.trim(),
    seoDescription: input.seoDescription.trim(),
  };
  const errors = validateSiteSettings(settings);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, settings: await repository.save(settings) };
}
