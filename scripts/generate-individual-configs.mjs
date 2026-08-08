/**
 * Configuration Generator for Individual Model Config YAML files
 * Run: node scripts/generate-individual-configs.mjs
 * 
 * Reads the auto_scanned_models.json and writes/updates YAML config files
 * inside local_model/<model_name>/<quantization>/ directories.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCANNED_JSON = resolve(__dirname, "..", "local_model", "auto_scanned_models.json");
const LOCAL_MODEL_DIR = resolve(__dirname, "..", "local_model");

function escapeYamlString(str) {
  if (!str) return '""';
  return `"${str.replace(/"/g, '\\"')}"`;
}

function determineParamsAndFlagship(m) {
  const name = m.name.toLowerCase();
  const tag = m.tag.toLowerCase();
  const displayName = m.displayName.toLowerCase();
  
  let parameterClass = "unknown";
  if (tag.includes("cloud") || tag.includes(":cloud")) {
    parameterClass = "cloud";
  } else if (m.paramSize && m.paramSize !== "?") {
    parameterClass = m.paramSize.toUpperCase();
  } else {
    // Fallback from sizeGb
    if (m.sizeGb < 2.0) parameterClass = "1B-3B";
    else if (m.sizeGb < 4.0) parameterClass = "3B-4B";
    else if (m.sizeGb < 7.0) parameterClass = "8B-9B";
    else if (m.sizeGb < 10.0) parameterClass = "12B-14B";
    else parameterClass = "14B+";
  }
  
  let isFlagship = false;
  let flagshipRole = "none";
  
  // Clean matching based on the benchmark top performers (checking both name and displayName)
  if (name.includes("translategemma") || displayName.includes("translategemma")) {
    isFlagship = true;
    flagshipRole = "reasoning";
  } else if ((name.includes("qwen3_6") || displayName.includes("qwen3.6")) && (name.includes("think") || displayName.includes("thinking"))) {
    isFlagship = true;
    flagshipRole = "reasoning";
  } else if ((name.includes("mellum2") || displayName.includes("mellum2")) && (name.includes("instruct") || displayName.includes("instruct"))) {
    isFlagship = true;
    flagshipRole = "coding";
  } else if (name.includes("minicpm") && (name.includes("v4_6") || displayName.includes("v4.6"))) {
    isFlagship = true;
    flagshipRole = "general";
  } else if (name.includes("minicpm") && (name.includes("v4_5") || displayName.includes("v4.5"))) {
    isFlagship = true;
    flagshipRole = "general";
  } else if (name.includes("aroow") && (name.includes("coder") || displayName.includes("coder"))) {
    isFlagship = true;
    flagshipRole = "coding";
  }
  
  return { parameterClass, isFlagship, flagshipRole };
}

function determineTier(m) {
  const name = m.name.toLowerCase();
  const tag = m.tag.toLowerCase();
  
  if (m.category === "EMBEDDING" || name.includes("embed") || name.includes("rerank") || name.includes("reranker")) {
    return "N/A";
  }
  
  if (tag.includes("cloud") || tag.includes(":cloud")) {
    if (name.includes("opus") || name.includes("frontier")) return "T3";
    if (name.includes("sonnet") || name.includes("mid")) return "T2";
    return "T1.5";
  }
  
  if (m.sizeGb && m.sizeGb < 4.0) {
    return "T0";
  }
  return "T1";
}

function generateYamlContent(m) {
  const isThinking = !!m.hasThinking;
  const recommendedTemp = m.recommendedTemp !== undefined ? m.recommendedTemp : 0.2;
  const recommendedCtx = m.recommendedCtx !== undefined ? m.recommendedCtx : 8192;
  const passRate = m.passRate !== undefined ? (m.passRate / 100) : 0.0;
  const avgLatency = m.avgLatency !== undefined ? +(m.avgLatency / 1000).toFixed(2) : 0.0;
  const tier = determineTier(m);
  const pData = determineParamsAndFlagship(m);

  return `# GoVibe Standalone Model Configuration
model_identity:
  name: ${escapeYamlString(m.name)}
  huggingface_url: ${escapeYamlString(m.hfUrl || "")}
  display_name: ${escapeYamlString(m.displayName)}
  model_tag: ${escapeYamlString(m.tag)}
  family: ${escapeYamlString(m.name.split("_")[0] || "unknown")}
  role: ${escapeYamlString(m.category === "CODE" ? "coder" : m.category === "REASONING" ? "architect" : "worker")}
  tier: ${escapeYamlString(tier)}
  # Industry-standard 2-Dimension Classification
  parameter_class: ${escapeYamlString(pData.parameterClass)}
  is_flagship: ${pData.isFlagship}
  flagship_role: ${escapeYamlString(pData.flagshipRole)}

benchmark_results:
  pass_rate: ${passRate}
  avg_warm_latency_sec: ${avgLatency}
  special_token_leak: ${!!m.tokenLeak}
  status: ${passRate >= 0.8 ? '"APPROVED"' : passRate >= 0.5 ? '"PROVISIONAL"' : '"EVALUATION"'}

execution_profile:
  output_mode: ${isThinking ? '"fence"' : '"json"'}
  temperature: ${recommendedTemp}
  top_p: ${m.recommendedTopP || 0.95}
  num_ctx: ${recommendedCtx}
  num_predict: ${isThinking ? 8192 : 4096}
  think: ${isThinking}
  keep_alive: "30m"

anti_error_rules:
  - "Output strictly clean code without special tokens or conversational filler."
  - "Verify all bounds and validity contracts explicitly in GoVibe runtime."
  - "Do not output any tags like <think> or </think> in final response."
`;
}

async function main() {
  const models = JSON.parse(readFileSync(SCANNED_JSON, "utf8"));
  console.log(`📂 Generating YAML configuration files for all ${models.length} models inside local_model/...`);

  let count = 0;
  for (const m of models) {
    // Sanitizing model name
    let modelName = m.displayName.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
    
    // Parse Quantization or version tag
    const parts = m.tag.split(':');
    let qTag = parts.length > 1 ? parts[1] : 'latest';
    qTag = qTag.replace(/[^a-zA-Z0-9-]/g, '_').toUpperCase();
    
    const newModelDir = resolve(LOCAL_MODEL_DIR, modelName, qTag);
    mkdirSync(newModelDir, { recursive: true });
    
    const configFileName = `${modelName}_config.yaml`;
    const filePath = resolve(newModelDir, configFileName);
    
    // Generate YAML content
    const yamlContent = generateYamlContent(m);
    
    // Write YAML config file
    writeFileSync(filePath, yamlContent, "utf8");
    
    // Update configFile property in scanned models JSON
    m.configFile = `${modelName}/${qTag}/${configFileName}`;
    count++;
  }

  // Write updated auto_scanned_models.json back
  writeFileSync(SCANNED_JSON, JSON.stringify(models, null, 2), "utf8");
  console.log(`✅ Successfully generated ${count} YAML config files in local_model/`);
}

main().catch(err => {
  console.error("❌ YAML Generation failed:", err);
  process.exit(1);
});
