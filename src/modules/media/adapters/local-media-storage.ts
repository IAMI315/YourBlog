import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { StoragePort } from "../../../infrastructure/storage/storage-port";

function defaultRoot(): string {
  const configuredRoot = process.env.MEDIA_STORAGE_ROOT;

  return configuredRoot ? resolve(configuredRoot) : join(process.cwd(), "data", "uploads");
}

function resolveInside(root: string, key: string): string {
  const normalizedRoot = resolve(root);
  const target = resolve(normalizedRoot, key);

  if (target !== normalizedRoot && !target.startsWith(`${normalizedRoot}\\`) && !target.startsWith(`${normalizedRoot}/`)) {
    throw new Error("Storage key escapes the media root.");
  }

  return target;
}

export class LocalMediaStorage implements StoragePort {
  private readonly root: string;

  constructor(root = defaultRoot()) {
    this.root = resolve(root);
  }

  async write(key: string, data: Uint8Array): Promise<void> {
    const target = resolveInside(this.root, key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async read(key: string): Promise<Uint8Array> {
    return readFile(resolveInside(this.root, key));
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const source = resolveInside(this.root, sourceKey);
    const destination = resolveInside(this.root, destinationKey);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }

  async removeTree(prefix: string): Promise<void> {
    await rm(resolveInside(this.root, prefix), { force: true, recursive: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await readFile(resolveInside(this.root, key));
      return true;
    } catch {
      return false;
    }
  }
}
