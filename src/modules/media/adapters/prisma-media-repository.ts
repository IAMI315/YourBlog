import type { PrismaClient } from "../../../generated/prisma/client";
import type {
  AcceptedMediaMime,
  MediaAssetRecord,
  MediaListOptions,
  StoredMediaInput,
} from "../domain/media";
import type { MediaRepository } from "../ports/media-repository";

type PrismaMediaRow = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: bigint;
  checksum: string;
  altText: string;
  createdAt: Date;
};

function toMediaRecord(row: PrismaMediaRow, usageCount?: number): MediaAssetRecord {
  return {
    id: row.id,
    originalName: row.originalName,
    storageKey: row.storageKey,
    mimeType: row.mimeType as AcceptedMediaMime,
    width: row.width ?? 0,
    height: row.height ?? 0,
    byteSize: Number(row.byteSize),
    checksum: row.checksum,
    altText: row.altText,
    createdAt: row.createdAt,
    usageCount,
  };
}

function contentReferencesMedia(content: unknown, id: string, storageKey: string): boolean {
  if (Array.isArray(content)) {
    return content.some((item) => contentReferencesMedia(item, id, storageKey));
  }

  if (!content || typeof content !== "object") return false;

  for (const value of Object.values(content)) {
    if (value === id || value === storageKey) return true;
    if (typeof value === "string" && value.includes(storageKey)) return true;
    if (contentReferencesMedia(value, id, storageKey)) return true;
  }

  return false;
}

export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: StoredMediaInput): Promise<MediaAssetRecord> {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        originalName: input.originalName,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        width: input.width,
        height: input.height,
        byteSize: BigInt(input.byteSize),
        checksum: input.checksum,
        altText: input.altText,
      },
    });

    return toMediaRecord(asset, 0);
  }

  async findById(id: string): Promise<MediaAssetRecord | null> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return null;

    return toMediaRecord(asset, await this.usageCount(id));
  }

  async list(options: MediaListOptions = {}): Promise<MediaAssetRecord[]> {
    const assets = await this.prisma.mediaAsset.findMany({
      where: options.search
        ? { originalName: { contains: options.search, mode: "insensitive" } }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      assets.map(async (asset) => toMediaRecord(asset, await this.usageCount(asset.id))),
    );
  }

  async updateAltText(id: string, altText: string): Promise<MediaAssetRecord> {
    const asset = await this.prisma.mediaAsset.update({
      where: { id },
      data: { altText: altText.trim() },
    });

    return toMediaRecord(asset, await this.usageCount(id));
  }

  async usageCount(id: string): Promise<number> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: { storageKey: true },
    });
    if (!asset) return 0;

    const [articleCovers, projectCovers, siteAvatars, articles] = await Promise.all([
      this.prisma.article.count({ where: { coverMediaId: id, deletedAt: null } }),
      this.prisma.webProject.count({ where: { coverMediaId: id } }),
      this.prisma.siteSettings.count({ where: { avatarMediaId: id } }),
      this.prisma.article.findMany({
        where: { deletedAt: null },
        select: { content: true },
      }),
    ]);
    const inlineArticleReferences = articles.filter((article) =>
      contentReferencesMedia(article.content, id, asset.storageKey),
    ).length;

    return articleCovers + projectCovers + siteAvatars + inlineArticleReferences;
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.mediaAsset.delete({ where: { id } });
  }
}
