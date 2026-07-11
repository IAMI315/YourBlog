import { mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import type { WebProjectEntry } from "../domain/web-project";
import type { WebProjectStorage } from "../ports/web-project-storage";

const SAFE_PROJECT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function defaultRoot(): string {
  const configuredRoot = process.env.WEB_PROJECT_STORAGE_ROOT;

  return configuredRoot ? resolve(configuredRoot) : join(process.cwd(), "data", "web-projects");
}

function resolveInside(root: string, key: string): string {
  const normalizedRoot = resolve(root);
  const target = resolve(normalizedRoot, key);

  if (target !== normalizedRoot && !target.startsWith(`${normalizedRoot}\\`) && !target.startsWith(`${normalizedRoot}/`)) {
    throw new Error("Storage key escapes the web-project root.");
  }

  return target;
}

export class LocalWebProjectStorage implements WebProjectStorage {
  private readonly root: string;

  constructor(root = defaultRoot()) {
    this.root = resolve(root);
  }

  async stage(token: string, entries: WebProjectEntry[]): Promise<string> {
    const prefix = `labs/previews/${token}/`;

    for (const entry of entries) {
      const target = resolveInside(this.root, `${prefix}${entry.normalizedPath}`);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, entry.bytes);
    }

    return prefix;
  }

  async publish(stagingPrefix: string, projectSlug: string, version: number): Promise<string> {
    assertSafeProjectSlug(projectSlug);
    const versionPrefix = `labs/projects/${projectSlug}/${version}/`;
    const source = resolveInside(this.root, stagingPrefix);
    const destination = resolveInside(this.root, versionPrefix);

    await mkdir(dirname(destination), { recursive: true });
    await rm(destination, { force: true, recursive: true });
    await rename(source, destination);

    return versionPrefix;
  }

  async activate(projectSlug: string, versionPrefix: string): Promise<void> {
    assertSafeProjectSlug(projectSlug);
    const projectRoot = resolveInside(this.root, `labs/projects/${projectSlug}/`);
    const versionRoot = resolveInside(this.root, versionPrefix);
    const current = resolveInside(this.root, `labs/projects/${projectSlug}/current`);
    const temporary = resolveInside(this.root, `labs/projects/${projectSlug}/.current-${Date.now()}`);
    const relativeTarget = relative(projectRoot, versionRoot);

    await mkdir(projectRoot, { recursive: true });
    await symlink(relativeTarget, temporary, "junction");
    await rm(current, { force: true, recursive: true });
    await rename(temporary, current);
  }

  async remove(prefix: string): Promise<void> {
    await rm(resolveInside(this.root, prefix), { force: true, recursive: true });
  }

  async read(key: string): Promise<Uint8Array> {
    return readFile(resolveInside(this.root, key));
  }
}

function assertSafeProjectSlug(slug: string): void {
  if (!SAFE_PROJECT_SLUG.test(slug)) {
    throw new Error("Project slug is not safe for web-project storage.");
  }
}
