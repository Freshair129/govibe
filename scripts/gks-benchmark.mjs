import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { readFileSync } from 'node:fs';

// Configuration
const KNOWLEDGE_BLOCK_DIR = path.join(process.cwd(), '.govibe-knowledge-block');
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODELS_TO_BENCHMARK = [
  'translategemma:latest',
  'hf.co/KevinJK51/Qwen3.6-12B-IQ-Ultra-Heretic-Uncensored-Thinking-V2-Hightop-GGUF:Q4_K_M',
  'hf.co/JetBrains/Mellum2-12B-A2.5B-Instruct-GGUF-Q4_K_M:Q4_K_M'
];
const REPORT_DIR = path.join(process.cwd(), 'report');
const LOCAL_MODEL_DIR = path.join(process.cwd(), 'local_model');
const MACHINE_PROFILE_PATH = path.join(os.homedir(), '.govibe', 'machine_profile.json');

let machineId = "UNKNOWN_MACHINE";
try {
  const profileData = readFileSync(MACHINE_PROFILE_PATH, 'utf8');
  machineId = JSON.parse(profileData).machine_id || "UNKNOWN_MACHINE";
} catch (e) {
  // Machine profile not found
}

function getSafeModelName(modelTag) {
    // Basic sanitization similar to reorganize script
    let name = modelTag.split(':')[0].replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
    // To match the exact folders we just created, we use the display name fallback if needed,
    // but since we only have tags here, we sanitize the tag.
    // E.g. hf.co/JetBrains/Mellum2... -> hf_co_jetbrains_mellum2...
    return name;
}

async function updateModelState(modelTag, success, durationMs, tokensUsed, taskType) {
    const safeModelName = getSafeModelName(modelTag);
    const statePath = path.join(LOCAL_MODEL_DIR, safeModelName, 'state.json');
    
    let state = {
        total_tasks: 0,
        successful_tasks: 0,
        failed_tasks: 0,
        total_duration_ms: 0,
        total_tokens_used: 0,
        task_types: {}
    };

    try {
        const fileData = await fs.readFile(statePath, 'utf8');
        state = JSON.parse(fileData);
    } catch (err) {
        // File doesn't exist or invalid JSON, start fresh
    }

    state.total_tasks += 1;
    if (success) {
        state.successful_tasks += 1;
    } else {
        state.failed_tasks += 1;
    }
    state.total_duration_ms += durationMs;
    state.total_tokens_used += tokensUsed;
    
    if (!state.task_types[taskType]) {
        state.task_types[taskType] = 0;
    }
    state.task_types[taskType] += 1;
    
    // Track execution machines
    if (!state.machines_used) state.machines_used = [];
    if (!state.machines_used.includes(machineId)) {
        state.machines_used.push(machineId);
    }
    state.last_executed_on = machineId;
    
    // Ensure dir exists (it should, but just in case)
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Extracts YAML frontmatter and content from a markdown file.
 */
function parseMarkdown(content) {
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let frontmatter = {};
  if (yamlMatch) {
    const yamlStr = yamlMatch[1];
    yamlStr.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join(':').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        frontmatter[key] = value;
      }
    });
    if (yamlStr.includes('relations:')) {
      const relations = [];
      const lines = yamlStr.split('\n');
      let inRelations = false;
      for (const line of lines) {
        if (line.startsWith('relations:')) { inRelations = true; continue; }
        if (inRelations && line.trim().startsWith('-')) {
          let rel = line.trim().substring(1).trim();
          if (rel.startsWith('"') && rel.endsWith('"')) rel = rel.slice(1, -1);
          relations.push(rel);
        } else if (inRelations && !line.startsWith(' ')) {
          inRelations = false;
        }
      }
      frontmatter.relations = relations;
    }
  }
  return { frontmatter, text: content.replace(/^---\n([\s\S]*?)\n---/, '').trim() };
}

/**
 * Walk directory and collect all markdown atoms
 */
async function loadGraph() {
  const nodes = {};
  async function walkDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'SCHEMA.md') {
          const content = await fs.readFile(fullPath, 'utf8');
          const { frontmatter, text } = parseMarkdown(content);
          const id = frontmatter.id || `[[${entry.name.replace('.md', '')}]]`;
          const wikiLinkRegex = /\[\[(.*?)\]\]/g;
          const inlineLinks = [];
          let match;
          while ((match = wikiLinkRegex.exec(text)) !== null) inlineLinks.push(`[[${match[1]}]]`);
          const relations = frontmatter.relations || [];
          const allLinks = Array.from(new Set([...relations, ...inlineLinks]));
          
          nodes[id] = {
            file: fullPath, id,
            type: frontmatter.type || path.basename(dir),
            title: frontmatter.title || entry.name,
            outgoing: allLinks, incoming: [], 
            content: text.substring(0, 500) 
          };
        }
      }
    } catch (e) {
      // directory might not exist yet
    }
  }

  await walkDir(KNOWLEDGE_BLOCK_DIR);
  for (const [id, node] of Object.entries(nodes)) {
    for (const target of node.outgoing) {
      if (nodes[target]) nodes[target].incoming.push(id);
    }
  }
  return nodes;
}

function analyzeStructuralGraph(nodes) {
  const orphans = [];
  const brokenLinks = [];
  for (const [id, node] of Object.entries(nodes)) {
    if (node.outgoing.length === 0 && node.incoming.length === 0) orphans.push(id);
    for (const out of node.outgoing) {
      if (!nodes[out]) brokenLinks.push({ source: id, target: out });
    }
  }
  return { orphans, brokenLinks };
}

async function askLocalLLM(model, graphNodes, structuralIssues) {
  console.log(`\n🧠 Calling Local LLM (${model}) for Semantic Graph Analysis...`);
  const graphSummary = Object.values(graphNodes).map(n => 
    `Node: ${n.id} (Type: ${n.type})\nTitle: ${n.title}\nOutgoing Links: ${n.outgoing.join(', ')}\nIncoming Links: ${n.incoming.join(', ')}\nSnippet: ${n.content.replace(/\n/g, ' ')}\n---`
  ).join('\n');
  
  const prompt = `You are an AI architect analyzing a knowledge graph for a software project. 
The knowledge graph consists of "Atoms" (nodes) with links to each other.

Here are the structural issues already found:
Orphans (no links): ${structuralIssues.orphans.join(', ') || 'None'}
Broken Links: ${structuralIssues.brokenLinks.map(b => `${b.source} -> ${b.target}`).join(', ') || 'None'}

Here is the graph data:
${graphSummary}

Please analyze the graph and report:
1. Are there any semantic orphans?
2. Are there any missing conceptual links?
3. What is the overall health of the knowledge graph?

Keep your answer concise and actionable.`;

  const startTime = Date.now();
  let tokens = 0;
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: { num_ctx: 4096 }
      })
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    // approximate tokens from Ollama metadata if available
    tokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);
    
    return { success: true, response: data.response, durationMs: duration, tokens };
  } catch (error) {
    return { success: false, response: `[LLM Error]: (${error.message})`, durationMs: Date.now() - startTime, tokens: 0 };
  }
}

async function run() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  
  console.log('🔍 Scanning .govibe-knowledge-block...');
  const nodes = await loadGraph();
  
  const structural = analyzeStructuralGraph(nodes);
  const benchmarkResults = [];
  
  if (Object.keys(nodes).length > 0) {
      for (const model of MODELS_TO_BENCHMARK) {
          const result = await askLocalLLM(model, nodes, structural);
          
          // Determine safe paths
          const safeModelName = getSafeModelName(model);
          const modelReportDir = path.join(REPORT_DIR, safeModelName);
          await fs.mkdir(modelReportDir, { recursive: true });
          
          // Save individual log
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const logFilename = `${timestamp}-graph-analysis.log`;
          const logPath = path.join(modelReportDir, logFilename);
          const logContent = `Model: ${model}\nMachine: ${machineId}\nDate: ${new Date().toISOString()}\nDuration: ${result.durationMs}ms\nSuccess: ${result.success}\nTokens: ${result.tokens}\n\nResponse:\n${result.response}`;
          
          await fs.writeFile(logPath, logContent, 'utf8');
          console.log(`✅ Saved log for ${model} to report/${safeModelName}/${logFilename}`);
          
          // Update State
          await updateModelState(model, result.success, result.durationMs, result.tokens, 'Graph_Analysis');
          console.log(`✅ Updated state.json for ${safeModelName}`);
          
          benchmarkResults.push({
              model, safeModelName, success: result.success, durationMs: result.durationMs, tokens: result.tokens,
              responsePreview: result.response.substring(0, 100).replace(/\n/g, ' ') + '...'
          });
      }
      
      // Generate Report
      console.log('\n📊 Generating Benchmark Summary Report...');
      let reportContent = `# Graph Verification Benchmark Summary\n\n`;
      reportContent += `**Executed on Machine:** ${machineId}\n\n`;
      reportContent += `| Model | Status | Time (ms) | Tokens | Preview |\n`;
      reportContent += `|---|---|---|---|---|\n`;
      
      benchmarkResults.sort((a, b) => a.durationMs - b.durationMs).forEach((res, index) => {
          const status = res.success ? '✅ Passed' : '❌ Failed';
          reportContent += `| **${index + 1}. ${res.safeModelName}** | ${status} | ${res.durationMs} | ${res.tokens} | ${res.responsePreview} |\n`;
      });
      
      const summaryPath = path.join(REPORT_DIR, 'REPORT_GRAPH_BENCHMARK.md');
      await fs.writeFile(summaryPath, reportContent, 'utf8');
      console.log(`✅ Saved final report to report/REPORT_GRAPH_BENCHMARK.md`);
      
  } else {
      console.log('\n⚠️ No knowledge atoms found.');
  }
}

run().catch(console.error);
