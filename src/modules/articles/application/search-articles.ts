import type { ArticleSummary } from "../domain/article";

export type ArticleSearchRepository = {
  searchPublished(query: string): Promise<ArticleSummary[]>;
};

type SearchArticlesDependencies = {
  repository: ArticleSearchRepository;
};

export async function searchArticles(
  { repository }: SearchArticlesDependencies,
  query: string,
): Promise<ArticleSummary[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) return [];

  return repository.searchPublished(trimmedQuery);
}
