import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

import type { StoragePort } from "../../../infrastructure/storage/storage-port";
import type { MediaAssetRecord, MediaListOptions, StoredMediaInput } from "../domain/media";
import type { MediaRepository } from "../ports/media-repository";
import { uploadMedia } from "./upload-media";

const REAL_1X1_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  ),
);
const NOW = new Date("2026-07-11T08:15:00.000Z");

class MemoryStorage implements StoragePort {
  writes = new Map<string, Uint8Array>();

  async write(key: string, data: Uint8Array): Promise<void> {
    this.writes.set(key, data);
  }

  async read(key: string): Promise<Uint8Array> {
    const data = this.writes.get(key);
    if (!data) throw new Error(`Missing storage key: ${key}`);
    return data;
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const data = await this.read(sourceKey);
    this.writes.delete(sourceKey);
    this.writes.set(destinationKey, data);
  }

  async removeTree(prefix: string): Promise<void> {
    for (const key of this.writes.keys()) {
      if (key.startsWith(prefix)) this.writes.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.writes.has(key);
  }
}

class MemoryMediaRepository implements MediaRepository {
  records = new Map<string, MediaAssetRecord>();
  nextId = 1;

  async create(input: StoredMediaInput): Promise<MediaAssetRecord> {
    const record = { ...input, id: `media-${this.nextId++}`, createdAt: NOW };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<MediaAssetRecord | null> {
    return this.records.get(id) ?? null;
  }

  async list(options: MediaListOptions = {}): Promise<MediaAssetRecord[]> {
    const records = Array.from(this.records.values());
    return options.search
      ? records.filter((record) => record.originalName.includes(options.search ?? ""))
      : records;
  }

  async updateAltText(id: string, altText: string): Promise<MediaAssetRecord> {
    const record = this.records.get(id);
    if (!record) throw new Error("Media not found");
    const updated = { ...record, altText };
    this.records.set(id, updated);
    return updated;
  }

  async usageCount(): Promise<number> {
    return 0;
  }

  async deleteById(id: string): Promise<void> {
    this.records.delete(id);
  }
}

function setup(id = "fixed-random-id") {
  const repository = new MemoryMediaRepository();
  const storage = new MemoryStorage();

  return {
    repository,
    storage,
    dependencies: {
      repository,
      storage,
      clock: { now: () => NOW },
      idFactory: () => id,
    },
  };
}

describe("uploadMedia", () => {
  it("sniffs PNG bytes instead of trusting a spoofed user path or extension", async () => {
    const { dependencies, repository, storage } = setup();

    const result = await uploadMedia(dependencies, {
      bytes: REAL_1X1_PNG,
      originalName: "../用户/头像.svg",
      altText: "像素",
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.storageKey).toBe("media/2026/07/fixed-random-id/original.png");
    expect(result.storageKey).not.toContain("用户");
    expect(result.storageKey).not.toContain("..");
    expect(repository.records.get(result.id)?.originalName).toBe("../用户/头像.svg");
    expect(storage.writes.has(result.storageKey)).toBe(true);
  });

  it("rejects SVG release-one uploads before anything is stored", async () => {
    const { dependencies, repository, storage } = setup();
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    );

    await expect(
      uploadMedia(dependencies, { bytes: svg, originalName: "图标.svg" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
    expect(repository.records.size).toBe(0);
    expect(storage.writes.size).toBe(0);
  });

  it("rejects files that expose metadata but fail a full decode before storage", async () => {
    const { dependencies, repository, storage } = setup();
    const truncatedPng = REAL_1X1_PNG.slice(0, 41);

    await expect(
      uploadMedia(dependencies, { bytes: truncatedPng, originalName: "broken.png" }),
    ).rejects.toMatchObject({ code: "MEDIA_DECODE_FAILED" });
    expect(repository.records.size).toBe(0);
    expect(storage.writes.size).toBe(0);
  });

  it("preserves Chinese names and records decoded 1x1 dimensions", async () => {
    const { dependencies } = setup();

    const result = await uploadMedia(dependencies, {
      bytes: REAL_1X1_PNG,
      originalName: "我的截图.png",
    });

    expect(result.originalName).toBe("我的截图.png");
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.variants).toEqual([]);
  });

  it("generates 480, 960, and 1600px WebP variants without upscaling", async () => {
    const { dependencies, storage } = setup("wide-image");
    const widePng = await sharp({
      create: {
        width: 2000,
        height: 1200,
        channels: 4,
        background: { r: 32, g: 96, b: 192, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await uploadMedia(dependencies, {
      bytes: widePng,
      originalName: "宽图.png",
    });

    expect(result.width).toBe(2000);
    expect(result.height).toBe(1200);
    expect(result.variants.map((variant) => variant.width)).toEqual([480, 960, 1600]);
    expect(result.variants.map((variant) => variant.storageKey)).toEqual([
      "media/2026/07/wide-image/w480.webp",
      "media/2026/07/wide-image/w960.webp",
      "media/2026/07/wide-image/w1600.webp",
    ]);

    for (const variant of result.variants) {
      const metadata = await sharp(await storage.read(variant.storageKey)).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(variant.width);
      expect(metadata.width).toBeLessThanOrEqual(result.width);
    }
  });

  it("rejects files larger than the configured limit", async () => {
    const { dependencies } = setup();

    await expect(
      uploadMedia(dependencies, {
        bytes: new Uint8Array(15 * 1024 * 1024 + 1),
        originalName: "huge.png",
      }),
    ).rejects.toMatchObject({ code: "MEDIA_TOO_LARGE" });
  });

  it("trims alternative text metadata", async () => {
    const { dependencies } = setup();

    const result = await uploadMedia(dependencies, {
      bytes: REAL_1X1_PNG,
      originalName: "alt.png",
      altText: "  A single pixel  ",
    });

    expect(result.altText).toBe("A single pixel");
  });

  it("uses the repository after storage writes succeed", async () => {
    const { dependencies, repository } = setup();
    const create = vi.spyOn(repository, "create");

    await uploadMedia(dependencies, {
      bytes: REAL_1X1_PNG,
      originalName: "order.png",
    });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].storageKey).toBe("media/2026/07/fixed-random-id/original.png");
  });
});
