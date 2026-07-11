export type TaxonomyKind = "category" | "tag";
export type TaxonomyId = string;

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
};

export type TaxonomyInput = Omit<TaxonomyItem, "id"> & {
  id?: string;
};
