import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDED_DIRECTORIES = new Set([".git", ".next", "coverage", "node_modules"]);

/**
 * @param {Buffer} buffer
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function inspectTextBuffer(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { ok: false, reason: "UTF-8 BOM is not allowed" };
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return { ok: false, reason: "Invalid UTF-8" };
  }
  if (text.includes("\r\n")) {
    return { ok: false, reason: "CRLF line endings are not allowed" };
  }
  if (text.includes("\r")) {
    return { ok: false, reason: "Carriage returns are not allowed" };
  }

  return { ok: true };
}

/** @param {string} fileName */
function isExcluded(fileName) {
  return fileName
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => EXCLUDED_DIRECTORIES.has(segment));
}

/**
 * @param {string} repositoryRoot
 * @returns {Promise<string[]>}
 */
export async function collectRepositoryTextFiles(repositoryRoot) {
  const textFiles = execFileSync(
    "git",
    ["ls-files", "-z", "--eol", "--cached", "--others", "--exclude-standard"],
    { cwd: repositoryRoot, encoding: "utf8" },
  )
    .split("\0")
    .flatMap((record) => {
      const separatorIndex = record.indexOf("\t");
      if (separatorIndex < 0) {
        return [];
      }

      const classification = record.slice(0, separatorIndex);
      const fileName = record.slice(separatorIndex + 1);
      const classificationTokens = new Set(classification.trim().split(/\s+/));
      const isExplicitText = classificationTokens.has("attr/text");
      const isBinary =
        classificationTokens.has("attr/-text") ||
        (!isExplicitText && classificationTokens.has("w/-text"));
      return fileName.length > 0 && !isBinary && !isExcluded(fileName)
        ? [resolve(repositoryRoot, fileName)]
        : [];
    });

  return textFiles.sort((left, right) => left.localeCompare(right));
}

/** @param {string} repositoryRoot */
export async function checkRepository(repositoryRoot) {
  /** @type {string[]} */
  const failures = [];
  const files = await collectRepositoryTextFiles(repositoryRoot);

  for (const filePath of files) {
    let buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const result = inspectTextBuffer(buffer);
    if (!result.ok) {
      failures.push(`${relative(repositoryRoot, filePath).replaceAll("\\", "/")}: ${result.reason}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    return 1;
  }

  return 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedPath) {
  process.exitCode = await checkRepository(process.cwd());
}
