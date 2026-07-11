import type { ArticleDraftInput } from "../domain/article";
import type { ArticleRepository } from "../ports/article-repository";
import { contentEquals } from "./content";
import { normalizeSlug } from "./slug";

type SaveDraftDependencies = {
  repository: ArticleRepository;
};

export async function saveDraft(
  { repository }: SaveDraftDependencies,
  input: ArticleDraftInput,
): Promise<{ id: string; revision: number }> {
  const article = await repository.saveDraft({
    ...input,
    slug: normalizeSlug(input.slug, input.title),
    title: input.title.trim(),
  });
  const latestRevision = await repository.latestRevision(article.id);

  if (latestRevision && contentEquals(latestRevision.content, article.content)) {
    return { id: article.id, revision: latestRevision.revision };
  }

  const revision = await repository.createRevision(article);
  return { id: article.id, revision };
}
