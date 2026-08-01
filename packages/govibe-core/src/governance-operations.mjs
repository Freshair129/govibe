import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { calculateWorkspaceImpact } from "./impact/impact-engine.mjs";

const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) await walk(fullPath);
      if (entry.isFile()) files.push(fullPath);
    }
  }
  await walk(root);
  return files;
}

function inside(root, requested) {
  const target = path.resolve(root, requested);
  const relative = path.relative(path.resolve(root), target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path escapes workspace.");
  return target;
}

export async function reviewWorkspace({ workspacePath }) {
  return { schema: "govibe-review/v1", mode: "read_only", filesInspected: (await listFiles(workspacePath)).length, findings: [] };
}

export async function workspaceImpact({
  workspacePath,
  paths = [],
  changeType = "semantic_change",
  maxDistance = 3,
  minimumScore = 0.2,
}) {
  if (!Array.isArray(paths) || paths.some((item) => typeof item !== "string" || !item.trim())) {
    throw new TypeError("Impact paths must be a non-empty string array.");
  }
  if (!Number.isInteger(maxDistance) || maxDistance < 1 || maxDistance > 8) {
    throw new TypeError("Impact maxDistance must be an integer between 1 and 8.");
  }
  if (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 1) {
    throw new TypeError("Impact minimumScore must be between 0 and 1.");
  }
  return calculateWorkspaceImpact({ workspacePath, paths, changeType, maxDistance, minimumScore });
}

export async function docsVersion({ workspacePath, path: requestedPath }) {
  const text = await readFile(inside(workspacePath, requestedPath), "utf8");
  const version = text.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] ?? null;
  return { schema: "govibe-doc-version/v1", path: requestedPath, version };
}

export async function optimizeMeasured({ measureBefore, optimize, measureAfter }) {
  const before = await measureBefore();
  await optimize();
  const after = await measureAfter();
  if (!Number.isFinite(before) || !Number.isFinite(after)) throw new Error("Optimize measurements must be finite numbers.");
  return { schema: "govibe-optimize/v1", before, after, delta: after - before };
}
