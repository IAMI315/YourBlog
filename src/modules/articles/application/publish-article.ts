import { AppError } from "../../../infrastructure/errors/app-error";
import type { Clock } from "../../../infrastructure/time/clock";
import type { ArticleRepository } from "../ports/article-repository";
import { hasPublishableContent } from "./content";

type PublishDependencies = {
  repository: ArticleRepository;
  clock: Clock;
};

export async function publishArticle({ repository, clock }: PublishDependencies, id: string) {
  const article = await repository.findById(id);

  if (!article || !article.title.trim() || !hasPublishableContent(article.content)) {
    throw new AppError("ARTICLE_NOT_READY", 400, "Article needs a title and content before publishing.");
  }

  return repository.publish(id, clock.now());
}
