import type { ArticleRepository } from "../ports/article-repository";

type RestoreDependencies = {
  repository: ArticleRepository;
};

export async function restoreRevision(
  { repository }: RestoreDependencies,
  articleId: string,
  revision: number,
): Promise<void> {
  await repository.replaceWithRevision(articleId, revision);
}
