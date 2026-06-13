import fs from "node:fs";
import path from "node:path";

function initWorkspace() {
  const root = process.cwd();
  console.log("Initializing GoVibe Agent Infrastructure (Native)...");

  // Directories
  const dirs = [
    ".agents/devops/handoff",
    "scripts/agents",
    "docs/adr",
    "docs/architecture"
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(root, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`[Info] Created: ${dir}`);
    }
  });

  // Handoff Log
  const logPath = path.join(root, ".agents/devops/handoff/log.jsonl");
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, "");
    console.log(`[Info] Created: .agents/devops/handoff/log.jsonl`);
  }

  // Base Contracts
  const contracts = ["agent.md", "GEMINI.md", "AGENTS.md"];
  contracts.forEach(c => {
    const p = path.join(root, c);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, `# Placeholder for ${c}\n`);
      console.log(`[Info] Created: ${c}`);
    }
  });

  console.log("\nSetup Complete. GoVibe Native Runtime ready.");
}

initWorkspace();
