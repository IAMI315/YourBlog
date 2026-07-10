import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectRepositoryTextFiles,
  inspectTextBuffer,
} from "../../scripts/check-utf8.mjs";

const CHECK_UTF8_SCRIPT = fileURLToPath(new URL("../../scripts/check-utf8.mjs", import.meta.url));
const temporaryDirectories: string[] = [];

async function createRepository() {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "utf8-guard-"));
  temporaryDirectories.push(repositoryRoot);
  execFileSync("git", ["init", "--quiet"], { cwd: repositoryRoot });
  await writeFile(
    join(repositoryRoot, ".gitattributes"),
    "* text=auto eol=lf\n*.png binary\n",
  );
  return repositoryRoot;
}

async function writeRepositoryFile(
  repositoryRoot: string,
  fileName: string,
  contents: string | Buffer,
) {
  const filePath = join(repositoryRoot, fileName);
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, contents);
}

function runCli(repositoryRoot: string) {
  return spawnSync(process.execPath, [CHECK_UTF8_SCRIPT], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("UTF-8 repository guard", () => {
  it("rejects a UTF-8 BOM", () => {
    expect(inspectTextBuffer(Buffer.from([0xef, 0xbb, 0xbf, 0x61]))).toEqual({
      ok: false,
      reason: "UTF-8 BOM is not allowed",
    });
  });

  it("accepts Chinese UTF-8 with LF line endings", () => {
    expect(inspectTextBuffer(Buffer.from("技术教程\n", "utf8"))).toEqual({ ok: true });
  });

  it("rejects invalid UTF-8", () => {
    expect(inspectTextBuffer(Buffer.from([0xc3, 0x28]))).toEqual({
      ok: false,
      reason: "Invalid UTF-8",
    });
  });

  it("rejects CRLF line endings", () => {
    expect(inspectTextBuffer(Buffer.from("line one\r\nline two\r\n", "utf8"))).toEqual({
      ok: false,
      reason: "CRLF line endings are not allowed",
    });
  });

  it("rejects a lone carriage return", () => {
    expect(inspectTextBuffer(Buffer.from("line one\rline two", "utf8"))).toEqual({
      ok: false,
      reason: "Carriage returns are not allowed",
    });
  });

  it("discovers tracked and untracked text files through Git attributes", async () => {
    const repositoryRoot = await createRepository();
    await writeRepositoryFile(repositoryRoot, "Dockerfile", "FROM node:24\n");
    await writeRepositoryFile(repositoryRoot, ".env.example", "PORT=3000\n");
    await writeRepositoryFile(repositoryRoot, "LICENSE", "Example license\n");
    await writeRepositoryFile(repositoryRoot, "nested/config", "enabled=true\n");
    execFileSync("git", ["add", ".gitattributes", "Dockerfile"], { cwd: repositoryRoot });

    const files = await collectRepositoryTextFiles(repositoryRoot);
    const relativeFiles = files.map((filePath) => relative(repositoryRoot, filePath).replaceAll("\\", "/"));

    expect(relativeFiles).toEqual(
      expect.arrayContaining(["Dockerfile", ".env.example", "LICENSE", "nested/config"]),
    );
  });

  it("excludes generated directories and files marked binary by Git attributes", async () => {
    const repositoryRoot = await createRepository();
    const invalidBytes = Buffer.from([0xc3, 0x28]);
    await writeRepositoryFile(repositoryRoot, "README", "valid text\n");
    await writeRepositoryFile(repositoryRoot, "asset.png", invalidBytes);
    await writeRepositoryFile(repositoryRoot, ".next/broken", invalidBytes);
    await writeRepositoryFile(repositoryRoot, "coverage/broken", invalidBytes);
    await writeRepositoryFile(repositoryRoot, "node_modules/example/broken", invalidBytes);

    const result = runCli(repositoryRoot);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("uses Git's content classification for files with text=auto", async () => {
    const repositoryRoot = await createRepository();
    await writeRepositoryFile(repositoryRoot, "payload.dat", Buffer.from([0x00, 0xc3, 0x28]));

    const result = runCli(repositoryRoot);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("validates files explicitly marked as text even when their content looks binary", async () => {
    const repositoryRoot = await createRepository();
    await writeRepositoryFile(
      repositoryRoot,
      ".gitattributes",
      "* text=auto eol=lf\n*.png binary\nforced.dat text eol=lf\n",
    );
    await writeRepositoryFile(repositoryRoot, "forced.dat", Buffer.from([0x00, 0xc3, 0x28]));

    const result = runCli(repositoryRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("forced.dat: Invalid UTF-8");
  });

  it("ignores tracked files deleted from the working tree", async () => {
    const repositoryRoot = await createRepository();
    await writeRepositoryFile(repositoryRoot, "removed.txt", "tracked text\n");
    execFileSync("git", ["add", ".gitattributes", "removed.txt"], { cwd: repositoryRoot });
    await rm(join(repositoryRoot, "removed.txt"));

    const result = runCli(repositoryRoot);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("prints relative diagnostics and exits nonzero for invalid extensionless text", async () => {
    const repositoryRoot = await createRepository();
    await writeRepositoryFile(repositoryRoot, "Dockerfile", "FROM node:24\r\n");
    await writeRepositoryFile(repositoryRoot, ".env.example", Buffer.from([0xef, 0xbb, 0xbf, 0x41]));
    await writeRepositoryFile(repositoryRoot, "licenses/LICENSE", Buffer.from([0xc3, 0x28]));

    const result = runCli(repositoryRoot);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Dockerfile: CRLF line endings are not allowed");
    expect(result.stderr).toContain(".env.example: UTF-8 BOM is not allowed");
    expect(result.stderr).toContain("licenses/LICENSE: Invalid UTF-8");
    expect(result.stderr).not.toContain(repositoryRoot);
  });
});
