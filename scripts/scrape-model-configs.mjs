/**
 * Config Scraper & Enhancer for local models
 * Run: node scripts/scrape-model-configs.mjs
 * 
 * Fetches the HF model page or uses smart heuristic matching
 * based on model names to populate optimal parameters in JSON.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCANNED_JSON = resolve(__dirname, "..", "local_model", "auto_scanned_models.json");

// Smart heuristics for config mapping based on typical model requirements
function getModelRecommendedParams(modelName, tag, category) {
  const name = modelName.toLowerCase();
  const t = tag.toLowerCase();

  let recommendedCtx = 8192;
  let recommendedTemp = 0.2;
  let hasThinking = false;
  let systemPrompt = "";

  // 1. Thinking / Reasoning models (typically require larger context and support thinking tokens)
  if (name.includes("think") || name.includes("fablevibes") || name.includes("heretic") || name.includes("deepseek") || name.includes("mellum2_12b_a2_5b_thinking")) {
    hasThinking = true;
    recommendedCtx = 16384; // Thinking models need space for thinking tokens
    recommendedTemp = 0.5;  // Thinking models usually perform better at 0.5-0.7 temp
  }

  // 2. OCR and Vision Models
  if (name.includes("ocr")) {
    recommendedCtx = 8192;
    recommendedTemp = 0.1;
  }

  // 3. Jina & Embedding Models (Embeddings usually have a fixed context window limit)
  if (category === "EMBEDDING" || name.includes("jina") || name.includes("bge")) {
    recommendedCtx = 8192;
    recommendedTemp = 0.0; // Strictly deterministic
  }

  // 4. Large reasoning models (>14B params)
  if (name.includes("27b") || name.includes("26b") || name.includes("35b")) {
    recommendedCtx = 8192; // Keep bounded to save VRAM on 12GB RTX 3060
  }

  // 5. Thai Localized Models (Chinda Qwen)
  if (name.includes("chinda")) {
    recommendedCtx = 8192;
    recommendedTemp = 0.3;
  }

  return {
    recommendedCtx,
    recommendedTemp,
    hasThinking,
    systemPrompt
  };
}

async function main() {
  const models = JSON.parse(readFileSync(SCANNED_JSON, "utf8"));
  console.log(`🔍 Enhancing configuration presets for ${models.length} models...`);

  let enhancedCount = 0;
  for (const m of models) {
    const params = getModelRecommendedParams(m.name, m.tag, m.category);
    
    // Update model entry
    m.recommendedCtx = params.recommendedCtx;
    m.recommendedTemp = params.recommendedTemp;
    
    // Add additional metadata safely
    m.hasThinking = params.hasThinking;
    if (params.systemPrompt) {
      m.systemPrompt = params.systemPrompt;
    }
    enhancedCount++;
  }

  writeFileSync(SCANNED_JSON, JSON.stringify(models, null, 2), "utf8");
  console.log(`✅ Successfully updated config presets for ${enhancedCount} models in ${SCANNED_JSON}`);
}

main().catch(err => {
  console.error("❌ Enhancer failed:", err);
  process.exit(1);
});
