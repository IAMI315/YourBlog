import "server-only";

import { revalidatePath } from "next/cache";

import { prisma } from "../../infrastructure/db/prisma";
import { saveDraft as saveDraftWithRepository } from "./application/save-draft";
import { publishArticle as publishArticleWithRepository } from "./application/publish-article";
import { createArticleQueryService } from "./application/query-articles";
import { recycleArticle, recoverArticle } from "./application/recycle-article";
import { restoreRevision as restoreRevisionWithRepository } from "./application/restore-revision";
import { PrismaArticleRepository } from "./adapters/prisma-article-repository";
import type { ArticleDraftInput, ArticleService } from "./domain/article";

const repository = new PrismaArticleRepository(prisma);
const clock = { now: () => new Date() };

export const articleService: ArticleService = {
  async saveDraft(input: ArticleDraftInput) {
    return saveDraftWithRepository({ repository }, input);
  },
  async publish(id: string) {
    const result = await publishArticleWithRepository({ repository, clock }, id);
    revalidatePath("/");
    revalidatePath(`/tutorials/${result.slug}`);
    return result;
  },
  async restoreRevision(articleId: string, revision: number) {
    await restoreRevisionWithRepository({ repository }, articleId, revision);
  },
  async recycle(id: string) {
    await recycleArticle({ repository, clock }, id);
  },
  async recover(id: string) {
    await recoverArticle({ repository, clock }, id);
  },
};

export const articleQueries = createArticleQueryService({ repository });

export type {
  ArticleDraftInput,
  ArticleAdminListOptions,
  ArticleQueryService,
  ArticleService,
  ArticleStatus,
  ArticleSummary,
} from "./domain/article";
