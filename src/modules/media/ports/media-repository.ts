import type { MediaAssetRecord, MediaListOptions, StoredMediaInput } from "../domain/media";

export interface MediaRepository {
  create(input: StoredMediaInput): Promise<MediaAssetRecord>;
  findById(id: string): Promise<MediaAssetRecord | null>;
  list(options?: MediaListOptions): Promise<MediaAssetRecord[]>;
  updateAltText(id: string, altText: string): Promise<MediaAssetRecord>;
  usageCount(id: string): Promise<number>;
  deleteById(id: string): Promise<void>;
}
