import { randomUUID } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { createDefaultStageAdapters } from "./stage-adapters.mjs";
import { runDeepScan } from "./stage-runner.mjs";

const ignored = new Set([".git", "node_modules", "dist", ".govibe", "state"]);

export async function inventoryWorkspace(workspacePath) {
  const files = [];
  const directories = new Set();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      const relative = path.relative(workspacePath, full).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        directories.add(relative);
        await visit(full);
      } else if (entry.isFile()) {
        const info = await stat(full);
        files.push({ path: relative, size: info.size, extension: path.extname(entry.name).toLowerCase() });
      }
    }
  }
  await visit(path.resolve(workspacePath));
  files.sort((a, b) => a.path.localeCompare(b.path));
  const languages = {};
  for (const file of files) {
    const key = file.extension || "[no-extension]";
    languages[key] = (languages[key] ?? 0) + 1;
  }
  const sourceOfTruth = files
    .filter((file) => /(^|\/)(readme\.md|package\.json|docs\/|specs\/|src\/)/i.test(file.path))
    .map((file) => file.path);
  return {
    schema: "govibe-scan-inventory/v1",
    files,
    directories: [...directories].sort(),
    languages,
    sourceOfTruth,
    exclusions: [...ignored].sort(),
  };
}

async function readWorkspaceId(workspacePath) {
  try {
    const config = JSON.parse(await readFile(path.join(workspacePath, ".govibe", "config.json"), "utf8"));
    if (config?.schema !== "govibe-workspace-config/v1" || typeof config.workspaceId !== "string" || !config.workspaceId.trim()) {
      throw new Error("invalid .govibe/config.json workspace identity");
    }
    return config.workspaceId.trim();
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function scanWorkspace({ workspacePath, deep = false, mspClient, actor = "unknown", adapters = createDefaultStageAdapters(), runId = randomUUID(), resume = false }) {
  const root = path.resolve(workspacePath);
  const inventory = await inventoryWorkspace(root);
  if (!deep) return { schema: "govibe-scan-result/v1", runId, level: "L1", status: "complete", inventory, deepScanRun: false };
  const workspaceId = await readWorkspaceId(root);
  return runDeepScan({ workspacePath: root, workspaceId, inventory, mspClient, actor, adapters, runId, resume });
}