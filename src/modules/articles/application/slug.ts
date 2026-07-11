import { createHash } from "node:crypto";

export function normalizeSlug(slug: string, title: string): string {
  const source = slug.trim() || title.trim();
  const ascii = source
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (ascii) return ascii;

  const hash = createHash("sha256").update(title).digest("hex").slice(0, 8);
  return `article-${hash}`;
}
