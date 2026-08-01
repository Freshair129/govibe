import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePathWithinRoot } from "./path-security.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapRoot = path.join(workspaceRoot, "docs", "roadmap");

export function resolveRoadmapSource(sourcePath) {
  return resolvePathWithinRoot(sourcePath, roadmapRoot, {
    message: "Roadmap source is outside the configured roadmap root.",
  });
}
