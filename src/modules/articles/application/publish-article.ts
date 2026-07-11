import { AppError } from "../../../infrastructure/errors/app-error";
import type { Clock } from "../../../infrastructure/time/clock";
import type { ArticleRepository } from "../ports/article-repository";

type PublishDependencies = {
  repository: ArticleRepository;
  clock: Clock;
};

export async function publishArticle({ repository, clock }: PublishDependencies, id: string) {
  const result = await repository.publishReady(id, clock.now());

  if (!result) {
    throw new AppError("ARTICLE_NOT_READY", 400, "Article needs a title and content before publishing.");
  }

  return result;
}
