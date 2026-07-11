import type { ArticleQueryService } from "../domain/article";
import type { ArticleRepository } from "../ports/article-repository";

type QueryDependencies = {
  repository: ArticleRepository;
};

export function createArticleQueryService({ repository }: QueryDependencies): ArticleQueryService {
  return {
    findPublishedBySlug(slug: string) {
      return repository.findPublishedBySlug(slug);
    },
    listPublished() {
      return repository.listPublished();
    },
  };
}
