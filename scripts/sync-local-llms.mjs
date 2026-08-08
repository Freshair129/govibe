/**
 * GoVibe Local LLM One-Click Synchronization Entrypoint
 * Run: node scripts/sync-local-llms.mjs
 * 
 * Automates the full lifecycle for Local LLMs:
 *   1. Scans installed Ollama models.
 *   2. Automatically updates settings based on model properties (e.g. Thinking, OCR, sizes).
 *   3. Re-writes individual YAML configuration profiles.
 */
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function runScript(scriptName) {
  const path = resolve(ROOT, "scripts", scriptName);
  console.log(`\n🏃 Running ${scriptName}...`);
  try {
    const out = execSync(`node ${path}`, { cwd: ROOT, encoding: "utf8" });
    console.log(out.trim());
  } catch (err) {
    console.error(`❌ Error executing ${scriptName}:`, err.message);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("🛡️  GoVibe Local LLM Pipeline Synchronizer");
console.log("==================================================");

// Step 1: Scan models from Ollama CLI
runScript("scan-ollama-models.mjs");

// Step 2: Apply optimal config presets
runScript("scrape-model-configs.mjs");

// Step 3: Write individual YAML profiles
runScript("generate-individual-configs.mjs");

console.log("\n==================================================");
console.log("✅ GoVibe Local LLMs are fully synchronized!");
console.log("==================================================");
