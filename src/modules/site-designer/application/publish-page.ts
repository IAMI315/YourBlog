import { AppError } from "../../../infrastructure/errors/app-error";
import type { Clock } from "../../../infrastructure/time/clock";
import type { PageRepository } from "../ports/page-repository";

type PublishPageDependencies = {
  repository: PageRepository;
  clock: Clock;
};

function hasPublishablePageContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasPublishablePageContent);

  const record = value as Record<string, unknown>;

  if (record.type === "image") return true;
  if (typeof record.text === "string" && record.text.trim()) return true;

  return Array.isArray(record.content) && record.content.some(hasPublishablePageContent);
}

export async function publishPage(
  { repository, clock }: PublishPageDependencies,
  id: string,
): Promise<{ slug: string; publishedAt: Date }> {
  const page = await repository.findById(id);

  if (!page?.title.trim() || !hasPublishablePageContent(page.content)) {
    throw new AppError("PAGE_NOT_READY", 422, "页面需要标题和正文后才能发布。");
  }

  return repository.publish(id, clock.now());
}
