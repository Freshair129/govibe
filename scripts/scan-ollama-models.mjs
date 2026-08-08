/**
 * Scan Ollama models and write auto_scanned_models.json
 * Run: node scripts/scan-ollama-models.mjs
 */
import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "..", "local_model", "auto_scanned_models.json");

// Category heuristics based on model name/tag
function guessCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("embed") || n.includes("bge-m3") || n.includes("rerank")) return "EMBEDDING";
  if (n.includes("rust") || n.includes("coder") || n.includes("code") || n.includes("mellum") || n.includes("instella")) return "CODE";
  if (n.includes("chinda") || n.includes("thai")) return "THAI-NLP";
  if (n.includes("ocr") || n.includes("minicpm")) return "GENERAL";
  return "REASONING";
}

// Extract a human-friendly display name from the tag
function toDisplayName(tag) {
  let base = tag.split("/").pop() || tag;        // last segment
  base = base.replace(/-GGUF.*/i, "");            // strip GGUF suffix
  base = base.replace(/[-_]/g, " ");              // dashes/underscores to spaces
  base = base.replace(/:.*$/, "");                 // strip :quant
  // Title-case
  return base.replace(/\b\w/g, c => c.toUpperCase()).trim() || tag;
}

// Extract quant from tag (after colon)
function extractQuant(tag) {
  const m = tag.match(/:([^/]+)$/);
  return m ? m[1] : "default";
}

// Parse size string like "5.4 GB" -> number in GB
function parseSize(sizeStr) {
  if (!sizeStr || sizeStr === "-") return 0;
  const m = sizeStr.match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "MB") return +(val / 1024).toFixed(2);
  if (unit === "KB") return +(val / (1024 * 1024)).toFixed(4);
  return +val.toFixed(2);
}

// Guess param size from the tag
function guessParamSize(tag) {
  const m = tag.match(/(\d+\.?\d*)\s*[bB]\b/);
  return m ? m[1] + "B" : "?";
}

try {
  const raw = execSync("ollama list", { encoding: "utf8" });
  const lines = raw.trim().split("\n").slice(1); // skip header

  const models = lines.map((line, i) => {
    // Parse columns: NAME (variable width), ID, SIZE, MODIFIED
    const cols = line.trim().split(/\s{2,}/);
    const tag = (cols[0] || "").trim();
    const sizeStr = (cols[2] || "").trim();
    const sizeGb = parseSize(sizeStr);
    const quant = extractQuant(tag);
    const displayName = toDisplayName(tag);
    const category = guessCategory(tag);
    const safeName = tag.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").substring(0, 60);

    return {
      id: `S${String(i + 1).padStart(2, "0")}`,
      name: safeName,
      displayName,
      tag,
      hfUrl: tag.startsWith("hf.co/")
        ? `https://huggingface.co/${tag.split(":")[0].replace("hf.co/", "")}`
        : "",
      category,
      configFile: "",
      status: "Queued",
      progressPercent: 0,
      maxCtx: 131072,
      testedCtx: 0,
      recommendedCtx: 8192,
      recommendedTemp: 0.2,
      recommendedTopP: 0.95,
      paramSize: guessParamSize(tag),
      quantization: quant,
      availableQuants: [{ name: quant, isDownloaded: true, sizeGb }],
      sizeGb,
      passRate: 0,
      avgLatency: 0,
      tps: 0,
      tokenLeak: false,
    };
  });

  writeFileSync(OUTPUT, JSON.stringify(models, null, 2), "utf8");
  console.log(`✅ Wrote ${models.length} models to ${OUTPUT}`);
} catch (err) {
  console.error("❌ Failed:", err.message);
  process.exit(1);
}
