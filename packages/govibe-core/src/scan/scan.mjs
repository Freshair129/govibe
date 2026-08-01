import { randomUUID } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
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

export async function scanWorkspace({ workspacePath, deep = false, mspClient, actor = "unknown", adapters = createDefaultStageAdapters(), runId = randomUUID(), resume = false }) {
  const inventory = await inventoryWorkspace(workspacePath);
  if (!deep) return { schema: "govibe-scan-result/v1", runId, level: "L1", status: "complete", inventory, deepScanRun: false };
  return runDeepScan({ workspacePath: path.resolve(workspacePath), inventory, mspClient, actor, adapters, runId, resume });
}
