import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDED_DIRECTORIES = new Set([".git", ".next", "coverage", "node_modules"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".env",
  ".gql",
  ".graphql",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".prisma",
  ".ps1",
  ".scss",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const TEXT_FILE_NAMES = new Set([
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".npmrc",
]);

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
function isTextFile(fileName) {
  return TEXT_FILE_NAMES.has(fileName) || TEXT_EXTENSIONS.has(extname(fileName).toLowerCase());
}

/**
 * @param {string} directory
 * @param {string[]} files
 */
async function collectTextFiles(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        await collectTextFiles(entryPath, files);
      }
    } else if (entry.isFile() && isTextFile(entry.name)) {
      files.push(entryPath);
    }
  }
}

/** @param {string} repositoryRoot */
async function checkRepository(repositoryRoot) {
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const failures = [];
  await collectTextFiles(repositoryRoot, files);

  for (const filePath of files) {
    const result = inspectTextBuffer(await readFile(filePath));
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
