import "server-only";

import { prisma } from "../../infrastructure/db/prisma";
import type { TaxonomyId, TaxonomyInput, TaxonomyItem, TaxonomyKind } from "./domain/taxonomy";

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listTaxonomy(kind: TaxonomyKind): Promise<TaxonomyItem[]> {
  return kind === "category"
    ? prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
    : prisma.tag.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function saveTaxonomy(kind: TaxonomyKind, input: TaxonomyInput): Promise<TaxonomyItem> {
  const data = {
    name: input.name.trim(),
    slug: normalizeSlug(input.slug || input.name),
    description: input.description,
    sortOrder: input.sortOrder,
  };
  if (kind === "category") {
    return input.id
      ? prisma.category.update({ where: { id: input.id }, data })
      : prisma.category.create({ data });
  }

  return input.id ? prisma.tag.update({ where: { id: input.id }, data }) : prisma.tag.create({ data });
}

export async function deleteTaxonomy(kind: TaxonomyKind, id: string): Promise<void> {
  if (kind === "category") {
    await prisma.category.delete({ where: { id } });
    return;
  }

  await prisma.tag.delete({ where: { id } });
}

export type { TaxonomyId, TaxonomyInput, TaxonomyItem, TaxonomyKind };
