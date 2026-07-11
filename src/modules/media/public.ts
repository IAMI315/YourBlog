import "server-only";

import { prisma } from "../../infrastructure/db/prisma";
import {
  deleteUnusedMedia as deleteUnusedMediaWithDependencies,
  getMediaUrl,
  uploadMedia as uploadMediaWithDependencies,
} from "./application/upload-media";
import { LocalMediaStorage } from "./adapters/local-media-storage";
import { PrismaMediaRepository } from "./adapters/prisma-media-repository";
import type { MediaListOptions, UploadMediaInput } from "./domain/media";

const repository = new PrismaMediaRepository(prisma);
const storage = new LocalMediaStorage();

export async function uploadMedia(input: UploadMediaInput) {
  return uploadMediaWithDependencies({ repository, storage }, input);
}

export async function listMedia(options?: MediaListOptions) {
  return repository.list(options);
}

export async function updateMediaAltText(id: string, altText: string) {
  return repository.updateAltText(id, altText);
}

export async function deleteUnusedMedia(id: string) {
  return deleteUnusedMediaWithDependencies({ repository, storage }, id);
}

export async function readMedia(storageKey: string) {
  return storage.read(storageKey);
}

export { getMediaUrl };

export type {
  AcceptedMediaMime,
  MediaAssetRecord,
  MediaListOptions,
  MediaVariant,
  UploadedMedia,
  UploadMediaInput,
} from "./domain/media";
