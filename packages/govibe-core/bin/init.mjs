import path from "node:path";
import { fileURLToPath } from "node:url";

import { createMspClientFromEnvironment, initializeWorkspace, readSkillDefinition } from "../src/index.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const builtInPath = path.join(packageRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md");
const builtInSkill = await readSkillDefinition(builtInPath);
const workspacePath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const result = await initializeWorkspace({
  workspacePath,
  builtInSkill,
  mspClient: createMspClientFromEnvironment(),
  actor: process.env.USERNAME ?? "govibe-cli",
});

console.log(JSON.stringify(result, null, 2));
