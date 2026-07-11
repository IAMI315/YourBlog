import type { ArticleDraftInput } from "../domain/article";
import type { ArticleRepository } from "../ports/article-repository";
import { normalizeSlug } from "./slug";

type SaveDraftDependencies = {
  repository: ArticleRepository;
};

export async function saveDraft(
  { repository }: SaveDraftDependencies,
  input: ArticleDraftInput,
): Promise<{ id: string; revision: number }> {
  return repository.saveDraftWithRevision({
    ...input,
    slug: normalizeSlug(input.slug, input.title),
    title: input.title.trim(),
  });
}
