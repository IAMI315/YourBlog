export type AcceptedMediaMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif"
  | "image/gif";

export type MediaVariant = {
  width: number;
  storageKey: string;
  mimeType: "image/webp";
  byteSize: number;
};

export type MediaAssetRecord = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: AcceptedMediaMime;
  width: number;
  height: number;
  byteSize: number;
  checksum: string;
  altText: string;
  createdAt: Date;
  usageCount?: number;
};

export type UploadedMedia = MediaAssetRecord & {
  variants: MediaVariant[];
};

export type UploadMediaInput = {
  bytes: Uint8Array;
  originalName: string;
  altText?: string;
};

export type StoredMediaInput = Omit<MediaAssetRecord, "id" | "createdAt" | "usageCount">;

export type MediaListOptions = {
  search?: string;
};
