import { createHash } from "node:crypto";

import { nanoid } from "nanoid";
import sharp from "sharp";

import { AppError } from "../../../infrastructure/errors/app-error";
import type { StoragePort } from "../../../infrastructure/storage/storage-port";
import type {
  AcceptedMediaMime,
  MediaAssetRecord,
  MediaVariant,
  UploadMediaInput,
  UploadedMedia,
} from "../domain/media";
import type { MediaRepository } from "../ports/media-repository";

export const MEDIA_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const RESPONSIVE_WIDTHS = [480, 960, 1600] as const;

type UploadMediaDependencies = {
  repository: MediaRepository;
  storage: StoragePort;
  clock?: { now(): Date };
  idFactory?: () => string;
};

type DetectedImage = {
  mimeType: AcceptedMediaMime;
  extension: string;
  width: number;
  height: number;
};

const formatMap: Record<string, { mimeType: AcceptedMediaMime; extension: string } | undefined> = {
  jpeg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
  avif: { mimeType: "image/avif", extension: "avif" },
  gif: { mimeType: "image/gif", extension: "gif" },
};

function toSafeAltText(altText: string | undefined): string {
  return (altText ?? "").trim();
}

function checksum(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function prefixFor(now: Date, id: string): string {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `media/${year}/${month}/${id}`;
}

function variantWidths(width: number): number[] {
  return RESPONSIVE_WIDTHS.filter((candidate) => candidate <= width);
}

async function detectImage(bytes: Uint8Array): Promise<DetectedImage> {
  let metadata: { format?: string; width?: number; height?: number };

  try {
    metadata = await sharp(bytes, { animated: false }).metadata();
  } catch (error) {
    throw new AppError("MEDIA_DECODE_FAILED", 400, "The uploaded file is not a supported image.", {
      cause: error,
    });
  }

  const format = metadata.format ?? "";
  const mapped = formatMap[format];

  if (!mapped || !metadata.width || !metadata.height) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", 400, "Only JPEG, PNG, WebP, AVIF, and GIF are supported.");
  }

  return { ...mapped, width: metadata.width, height: metadata.height };
}

async function assertFullyDecodable(bytes: Uint8Array): Promise<void> {
  try {
    await sharp(bytes, { animated: false }).toBuffer();
  } catch (error) {
    throw new AppError("MEDIA_DECODE_FAILED", 400, "The uploaded file is not a supported image.", {
      cause: error,
    });
  }
}

async function writeVariants(
  storage: StoragePort,
  bytes: Uint8Array,
  prefix: string,
  sourceWidth: number,
): Promise<MediaVariant[]> {
  const variants: MediaVariant[] = [];

  for (const width of variantWidths(sourceWidth)) {
    const output = await sharp(bytes, { animated: false })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const storageKey = `${prefix}/w${width}.webp`;

    await storage.write(storageKey, output);
    variants.push({ width, storageKey, mimeType: "image/webp", byteSize: output.byteLength });
  }

  return variants;
}

export async function uploadMedia(
  { repository, storage, clock = { now: () => new Date() }, idFactory = nanoid }: UploadMediaDependencies,
  input: UploadMediaInput,
): Promise<UploadedMedia> {
  if (input.bytes.byteLength === 0) {
    throw new AppError("MEDIA_EMPTY", 400, "The uploaded file is empty.");
  }

  if (input.bytes.byteLength > MEDIA_UPLOAD_MAX_BYTES) {
    throw new AppError("MEDIA_TOO_LARGE", 413, "The uploaded file is too large.");
  }

  const detected = await detectImage(input.bytes);
  await assertFullyDecodable(input.bytes);
  const id = idFactory();
  const prefix = prefixFor(clock.now(), id);
  const storageKey = `${prefix}/original.${detected.extension}`;

  await storage.write(storageKey, input.bytes);
  const variants = await writeVariants(storage, input.bytes, prefix, detected.width);
  const asset = await repository.create({
    originalName: input.originalName,
    storageKey,
    mimeType: detected.mimeType,
    width: detected.width,
    height: detected.height,
    byteSize: input.bytes.byteLength,
    checksum: checksum(input.bytes),
    altText: toSafeAltText(input.altText),
  });

  return { ...asset, variants };
}

export async function deleteUnusedMedia(
  { repository, storage }: Pick<UploadMediaDependencies, "repository" | "storage">,
  id: string,
): Promise<void> {
  const asset = await repository.findById(id);
  if (!asset) return;

  const usageCount = await repository.usageCount(id);
  if (usageCount > 0) {
    throw new AppError("MEDIA_IN_USE", 409, "This media item is still in use.");
  }

  await repository.deleteById(id);
  await storage.removeTree(asset.storageKey.split("/").slice(0, -1).join("/"));
}

export function assertMediaHasAltText(asset: Pick<MediaAssetRecord, "altText">): void {
  if (!asset.altText.trim()) {
    throw new AppError("MEDIA_ALT_TEXT_REQUIRED", 400, "Alternative text is required before publishing.");
  }
}

export function getMediaUrl(storageKey: string): string {
  return `/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
