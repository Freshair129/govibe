import fs from 'fs';
import path from 'path';

const OLLAMA_HOST = 'http://127.0.0.1:11434';
const CONFIG_DIR = 'G:/govibe/model_configs';

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Standalone candidate models available in GoVibe
const TARGET_MODELS = [
  { name: 'qwen3.5_4b', modelTag: 'qwen3.5:4b', role: 'worker', family: 'qwen35', defaultFormat: 'json' },
  { name: 'aroow_rust_coder_9b', modelTag: 'hf.co/sillykiwi/Aroow-Rust-Coder-9B-Q4_K_S-GGUF:Q4_K_S', role: 'coder', family: 'qwen35', defaultFormat: 'fence' },
  { name: 'gemma4_12b_it', modelTag: 'hf.co/unsloth/gemma-4-12b-it-GGUF:UD-Q4_K_XL', role: 'architect', family: 'gemma4', defaultFormat: 'fence' },
  { name: 'gemma4_rust_coder', modelTag: 'gemma4-rust-coder:latest', role: 'coder', family: 'gemma4', defaultFormat: 'fence' },
  { name: 'chinda_qwen3_4b', modelTag: 'hf.co/iapp/chinda-qwen3-4b-gguf:Q4_K_M', role: 'worker', family: 'qwen3', defaultFormat: 'json' },
  { name: 'bonsai_27b', modelTag: 'hf.co/prism-ml/Bonsai-27B-gguf:Q1_0', role: 'architect', family: 'qwen35', defaultFormat: 'json' },
  { name: 'mellum2_12b', modelTag: 'hf.co/JetBrains/Mellum2-12B-A2.5B-Instruct-GGUF-Q4_K_M:Q4_K_M', role: 'coder', family: 'mellum', defaultFormat: 'fence' },
  { name: 'qwen3.6_27b', modelTag: 'qwen3.6:27b', role: 'architect', family: 'qwen35', defaultFormat: 'fence' }
];

function stripTsTypes(tsCode) {
  return tsCode
    .replace(/^export\s+/gm, '')
    .replace(/:\s*(number|string|boolean|void|any|Record<[^>]+>|Array<[^>]+>|\w+)(\[\])?/g, '')
    .replace(/<[^>]+>/g, '');
}

const TASKS = [
  {
    id: 'clamp01',
    prompt: `You are a focused code generator. ONE task. Pure function, no imports.
Respond as JSON: {"code":"<full ts code>"} or single \`\`\`ts block.
Implement EXACTLY:
export function clamp01(x: number): number { ... }
Rules:
- If x < 0 return 0. If x > 1 return 1. Otherwise return x.
Acceptance: clamp01(-1) -> 0. clamp01(0.5) -> 0.5. clamp01(2) -> 1.`,
    verify: (rawCode) => {
      try {
        const jsCode = stripTsTypes(rawCode);
        const fn = new Function('x', `${jsCode}; return clamp01(x);`);
        return fn(-1) === 0 && fn(0.5) === 0.5 && fn(2) === 1;
      } catch (e) {
        return false;
      }
    }
  },
  {
    id: 'parseTimecode',
    prompt: `You are a focused code generator. ONE task. Pure function, no imports.
Respond as JSON: {"code":"<full ts code>"} or single \`\`\`ts block.
Implement EXACTLY:
export function parseTimecode(s: string): number { ... }
Rules:
- Format "MM:SS.mmm". Convert to total seconds as float.
- Return -1 if input string is invalid or does not match format.
Acceptance: parseTimecode("00:05.000") -> 5. parseTimecode("01:02.500") -> 62.5. parseTimecode("invalid") -> -1.`,
    verify: (rawCode) => {
      try {
        const jsCode = stripTsTypes(rawCode);
        const fn = new Function('s', `${jsCode}; return parseTimecode(s);`);
        return fn("00:05.000") === 5 && fn("01:02.500") === 62.5 && fn("invalid") === -1;
      } catch (e) {
        return false;
      }
    }
  }
];

function extractCode(resText) {
  let cleaned = resText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && parsed.code) return parsed.code;
  } catch (e) {}
  const fenceMatch = cleaned.match(/```(?:ts|typescript|js|rust)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return cleaned;
}

async function testModel(target) {
  console.log(`\n==================================================`);
  console.log(`[GOBIBE STANDALONE BENCHMARK] ${target.name} (${target.modelTag})`);
  console.log(`==================================================`);

  let passCount = 0;
  let totalLatency = 0;
  let hasSpecialTokenLeak = false;

  for (const task of TASKS) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: target.modelTag,
          prompt: task.prompt,
          stream: false,
          options: { temperature: 0.1, num_ctx: 8192, num_predict: 2048, think: false }
        })
      });
      const elapsed = (Date.now() - startTime) / 1000;
      totalLatency += elapsed;

      if (!response.ok) {
        console.log(`  ❌ Task ${task.id}: HTTP error ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawOutput = data.response || '';
      if (/<unused\d+>|<\|.*?\|>|<pad>/.test(rawOutput)) hasSpecialTokenLeak = true;

      const code = extractCode(rawOutput);
      const passed = task.verify(code);

      if (passed) {
        passCount++;
        console.log(`  ✅ Task ${task.id}: PASSED in ${elapsed.toFixed(2)}s`);
      } else {
        console.log(`  ❌ Task ${task.id}: FAILED in ${elapsed.toFixed(2)}s`);
      }
    } catch (err) {
      console.log(`  ❌ Task ${task.id}: Exception ${err.message}`);
    }
  }

  const avgLatency = (totalLatency / TASKS.length).toFixed(2);
  const passRate = passCount / TASKS.length;

  generateYamlConfig(target, passRate, parseFloat(avgLatency), hasSpecialTokenLeak);
}

function generateYamlConfig(target, passRate, avgLatency, hasSpecialTokenLeak) {
  const yamlContent = `# GoVibe Standalone Model Configuration
model_identity:
  name: "${target.name}"
  model_tag: "${target.modelTag}"
  family: "${target.family}"
  role: "${target.role}"

benchmark_results:
  pass_rate: ${passRate}
  avg_warm_latency_sec: ${avgLatency}
  special_token_leak: ${hasSpecialTokenLeak}
  status: "${passRate >= 0.8 && !hasSpecialTokenLeak ? 'APPROVED' : passRate >= 0.5 ? 'PROVISIONAL' : 'DEMOTED'}"

execution_profile:
  output_mode: "${target.defaultFormat}"
  temperature: ${target.role === 'architect' ? 0.2 : 0.1}
  top_p: 0.95
  num_ctx: ${target.role === 'architect' ? 12288 : 8192}
  num_predict: ${target.role === 'architect' ? 4096 : 2048}
  think: false
  keep_alive: "30m"

anti_error_rules:
  - "Output strictly clean code without special tokens or conversational filler."
  - "Verify all bounds and validity contracts explicitly in GoVibe runtime."
`;

  const filePath = path.join(CONFIG_DIR, `${target.name}_config.yaml`);
  fs.writeFileSync(filePath, yamlContent, 'utf8');
  console.log(`💾 Saved Standalone Config: ${filePath}`);
}

async function main() {
  console.log("🚀 Starting GoVibe Standalone Model Isolation Benchmark...");
  for (const target of TARGET_MODELS) {
    await testModel(target);
  }
  console.log("\n✨ Benchmark Completed! All standalone configs saved in G:/govibe/model_configs/");
}

main();
