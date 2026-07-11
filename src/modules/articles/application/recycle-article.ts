import { AppError } from "../../../infrastructure/errors/app-error";
import type { Clock } from "../../../infrastructure/time/clock";
import type { ArticleRepository } from "../ports/article-repository";

const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type RecycleDependencies = {
  repository: ArticleRepository;
  clock: Clock;
};

export async function recycleArticle(
  { repository, clock }: RecycleDependencies,
  id: string,
): Promise<void> {
  await repository.markDeleted(id, clock.now());
}

export async function recoverArticle(
  { repository, clock }: RecycleDependencies,
  id: string,
): Promise<void> {
  const article = await repository.findById(id);

  if (!article?.deletedAt) {
    throw new AppError("ARTICLE_NOT_IN_RECYCLE_BIN", 400, "Article is not in the recycle bin.");
  }

  if (clock.now().getTime() - article.deletedAt.getTime() > RECOVERY_WINDOW_MS) {
    throw new AppError("ARTICLE_RECOVERY_EXPIRED", 410, "Article recovery window has expired.");
  }

  await repository.recover(id);
}
