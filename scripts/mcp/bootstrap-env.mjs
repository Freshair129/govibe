#!/usr/bin/env node
// TASK-PRD-010 (GAP-09 / GATE-BOOTSTRAP): a clean checkout has `.env.example` but no way to
// turn it into a working `.env` without a human manually generating a random token and pasting
// it into two places (GOVIBE_MCP_TOKEN and VITE_GOVIBE_MCP_TOKEN) while keeping them identical.
// This script does that one step: copy .env.example to the gitignored .env, mint one random
// token, and populate both placeholders with it. It never overwrites an existing .env — if one
// is already present, it exits 0 and prints a note instead of touching it, so re-running is
// always safe (idempotent) and a developer's real local config is never clobbered.
//
// Usage: npm run env:bootstrap
import { randomBytes } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const examplePath = path.join(repoRoot, ".env.example");
const envPath = path.join(repoRoot, ".env");

const GOVIBE_TOKEN_PLACEHOLDER = "replace-with-a-random-local-token";
const VITE_TOKEN_PLACEHOLDER = "replace-with-the-same-random-local-token";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await exists(envPath)) {
    console.log(`.env already exists at ${envPath} — leaving it untouched.`);
    console.log("Delete it first if you want this script to regenerate one, or edit it by hand.");
    return;
  }

  if (!(await exists(examplePath))) {
    console.error(`Cannot bootstrap: ${examplePath} is missing.`);
    process.exitCode = 1;
    return;
  }

  const template = await readFile(examplePath, "utf8");
  if (!template.includes(GOVIBE_TOKEN_PLACEHOLDER) || !template.includes(VITE_TOKEN_PLACEHOLDER)) {
    console.error(
      "Cannot bootstrap: .env.example no longer contains the expected token placeholders. " +
        "Copy it to .env by hand and set GOVIBE_MCP_TOKEN / VITE_GOVIBE_MCP_TOKEN to the same random value.",
    );
    process.exitCode = 1;
    return;
  }

  const token = randomBytes(32).toString("hex");
  const populated = template
    .split(GOVIBE_TOKEN_PLACEHOLDER).join(token)
    .split(VITE_TOKEN_PLACEHOLDER).join(token);

  await writeFile(envPath, populated, { encoding: "utf8" });
  console.log(`Wrote ${envPath} with a fresh 64-character local sidecar token.`);
  console.log("GOVIBE_MCP_TOKEN and VITE_GOVIBE_MCP_TOKEN are set to the same value — no further edits needed.");
  console.log("Next: npm run mcp:dev  (terminal 1)  and  npm run dev  (terminal 2).");
}

main().catch((error) => {
  console.error("env:bootstrap failed:", error.message);
  process.exitCode = 1;
});
