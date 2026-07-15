import type { PageQueryService } from "../domain/page";
import type { PageRepository } from "../ports/page-repository";

type PageQueryDependencies = {
  repository: PageRepository;
};

export function createPageQueryService({ repository }: PageQueryDependencies): PageQueryService {
  return {
    findPublishedBySlug: (slug) => repository.findPublishedBySlug(slug),
    searchPublished: (query) => repository.searchPublished(query),
    listForNavigation: () => repository.listForNavigation(),
    listForAdmin: () => repository.listForAdmin(),
    findForEditor: (id) => repository.findForEditor(id),
  };
}
