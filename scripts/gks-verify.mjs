import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Configuration
const KNOWLEDGE_BLOCK_DIR = path.join(process.cwd(), '.govibe-knowledge-block');
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'translategemma'; // Top ranked Reasoning model from benchmark

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
        // naive parsing for arrays/strings
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        frontmatter[key] = value;
      }
    });
    // Very naive array parser for relations
    if (yamlStr.includes('relations:')) {
      const relations = [];
      const lines = yamlStr.split('\n');
      let inRelations = false;
      for (const line of lines) {
        if (line.startsWith('relations:')) {
          inRelations = true;
          continue;
        }
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
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'SCHEMA.md') {
        const content = await fs.readFile(fullPath, 'utf8');
        const { frontmatter, text } = parseMarkdown(content);
        
        const id = frontmatter.id || `[[${entry.name.replace('.md', '')}]]`;
        
        // Find wikilinks in text
        const wikiLinkRegex = /\[\[(.*?)\]\]/g;
        const inlineLinks = [];
        let match;
        while ((match = wikiLinkRegex.exec(text)) !== null) {
          inlineLinks.push(`[[${match[1]}]]`);
        }
        
        // Combine relations and inline links
        const relations = frontmatter.relations || [];
        const allLinks = Array.from(new Set([...relations, ...inlineLinks]));
        
        nodes[id] = {
          file: fullPath,
          id,
          type: frontmatter.type || path.basename(dir),
          title: frontmatter.title || entry.name,
          outgoing: allLinks,
          incoming: [], // to be populated
          content: text.substring(0, 500) // snippet for LLM
        };
      }
    }
  }

  await walkDir(KNOWLEDGE_BLOCK_DIR);

  // Compute incoming links
  for (const [id, node] of Object.entries(nodes)) {
    for (const target of node.outgoing) {
      if (nodes[target]) {
        nodes[target].incoming.push(id);
      }
    }
  }

  return nodes;
}

/**
 * Structural checks for Graph
 */
function analyzeStructuralGraph(nodes) {
  const orphans = [];
  const brokenLinks = [];
  
  for (const [id, node] of Object.entries(nodes)) {
    if (node.outgoing.length === 0 && node.incoming.length === 0) {
      orphans.push(id);
    }
    
    for (const out of node.outgoing) {
      if (!nodes[out]) {
        brokenLinks.push({ source: id, target: out });
      }
    }
  }
  
  return { orphans, brokenLinks };
}

/**
 * LLM-assisted graph validation
 */
async function askLocalLLM(graphNodes, structuralIssues) {
  console.log(`\n🧠 Calling Local LLM (${DEFAULT_MODEL}) for Semantic Graph Analysis...`);
  
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
1. Are there any semantic orphans? (e.g. an API document that doesn't link to the Data Model it uses)
2. Are there any missing conceptual links?
3. What is the overall health of the knowledge graph?

Keep your answer concise and actionable.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 4096
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    return `[LLM Error]: Could not reach local Ollama instance. Is it running? (${error.message})`;
  }
}

async function run() {
  console.log('🔍 Scanning .govibe-knowledge-block...');
  const nodes = await loadGraph();
  
  console.log(`Found ${Object.keys(nodes).length} knowledge atoms.\n`);
  
  const structural = analyzeStructuralGraph(nodes);
  console.log('🚨 Structural Issues:');
  console.log(`Orphan Nodes: ${structural.orphans.length > 0 ? structural.orphans.join(', ') : 'None'}`);
  console.log(`Broken Links: ${structural.brokenLinks.length > 0 ? structural.brokenLinks.map(b => `${b.source} -> ${b.target}`).join(', ') : 'None'}`);
  
  if (Object.keys(nodes).length > 0) {
      const llmAnalysis = await askLocalLLM(nodes, structural);
      console.log('\n🤖 LLM Semantic Analysis:');
      console.log(llmAnalysis);
  } else {
      console.log('\n⚠️ No knowledge atoms found. Add some .md files to .govibe-knowledge-block/ first.');
  }
}

run().catch(console.error);
