import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);

function readArg(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  return "";
}

function now() {
  return new Date().toISOString();
}

function runGit(repoRoot, gitArgs) {
  try {
    return execFileSync("git", gitArgs, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function runValidation(repoRoot, command) {
  try {
    const stdout = execSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      exitCode: Number.isInteger(error.status) ? error.status : 1,
      stdout: error.stdout?.toString() ?? "",
      stderr: error.stderr?.toString() ?? error.message ?? "",
    };
  }
}

function existingArtifacts(repoRoot) {
  const candidates = [
    "AGENTS.md",
    "AGENT.md",
    "GEMINI.md",
    "CLAUDE.md",
    "FRAMEWORK_MASTER_SPEC.md",
    "atom_schema.yaml",
    "packages/msp",
    "packages/gks",
    "apps/web",
    ".brain/cognitive-system-knowledge-block",
    "gks",
  ];

  return candidates.filter((candidate) => existsSync(resolve(repoRoot, candidate)));
}

function taxonomyMapping() {
  return [
    { govibe: "PRD", msp_gks: "CONCEPT + FEAT intent chain", confidence: "medium" },
    { govibe: "ADR", msp_gks: "ADR", confidence: "high" },
    { govibe: "FEAT", msp_gks: "FEAT", confidence: "high" },
    { govibe: "SDD", msp_gks: "BLUEPRINT + architecture refs", confidence: "medium" },
    { govibe: "RUNBOOK", msp_gks: "BLUEPRINT or operational procedure note", confidence: "medium" },
  ];
}

function unmappedConcepts() {
  return [
    "CONTEXT as first-class GoVibe context packet",
    "ROADMAP as LYRA-owned planning source",
    "DOC_VERSION_REGISTRY as ATHER-owned audit sitemap",
  ];
}

function nonEmptyLines(text) {
  return String(text ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function warningLines(validation) {
  const lines = nonEmptyLines(`${validation.stderr}\n${validation.stdout}`);
  const matching = lines.filter((line) => /warn|error|fail|missing|not found|invalid/i.test(line)).slice(0, 20);
  if (matching.length > 0) return matching;
  if (validation.exitCode && validation.exitCode !== 0) return lines.slice(-20);
  return [];
}

function outputExcerpt(validation) {
  return nonEmptyLines(`${validation.stdout}\n${validation.stderr}`).slice(-30);
}

function decisionFor({ missingEvidence, exitCode }) {
  if (missingEvidence.length > 0) return "blocked_by_missing_evidence";
  if (exitCode !== 0) return "create_change_request";
  return "accept_reference";
}

function confidenceFor({ missingEvidence, exitCode, sourceGitStatus }) {
  if (missingEvidence.length > 0) return "low";
  if (exitCode !== 0) return "medium";
  if (sourceGitStatus.split(/\r?\n/).some((line) => /^[ MADRCU?!]/.test(line))) return "medium";
  return "high";
}

function yamlScalar(value, indent) {
  if (value === null || value === undefined) return "null";
  const text = String(value ?? "");
  if (text.includes("\n")) {
    const pad = " ".repeat(indent + 2);
    return `|\n${text.split(/\r?\n/).map((line) => `${pad}${line}`).join("\n")}`;
  }
  if (text === "" || /[:#\-[\]{},&*!|>'"%@`]/.test(text)) return JSON.stringify(text);
  return text;
}

function toYaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => {
      if (item && typeof item === "object") {
        const nested = toYaml(item, indent + 2);
        return `${pad}- ${nested.trimStart()}`;
      }
      return `${pad}- ${yamlScalar(item, indent)}`;
    }).join("\n");
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => {
      if (Array.isArray(item) || (item && typeof item === "object")) {
        return `${pad}${key}:\n${toYaml(item, indent + 2)}`;
      }
      return `${pad}${key}: ${yamlScalar(item, indent)}`;
    }).join("\n");
  }

  return yamlScalar(value, indent);
}

const repoArg = readArg("--repo") || process.env.MSP_REPO_ROOT || "";
const command = readArg("--command") || process.env.MSP_VALIDATE_COMMAND || "npm run msp:validate";
const startedAt = now();
const missingEvidence = [];
const sourceRepo = repoArg ? resolve(repoArg) : "";

if (!sourceRepo) {
  missingEvidence.push("MSP_REPO_ROOT or --repo is required.");
} else if (!existsSync(sourceRepo)) {
  missingEvidence.push(`Source repo path does not exist: ${sourceRepo}`);
}

let validation = { exitCode: null, stdout: "", stderr: "" };
let sourceCommit = "";
let sourceGitStatus = "";
let artifacts = [];

if (missingEvidence.length === 0) {
  sourceCommit = runGit(sourceRepo, ["rev-parse", "HEAD"]) || "unknown";
  sourceGitStatus = runGit(sourceRepo, ["status", "--short", "--branch"]) || "unknown";
  artifacts = existingArtifacts(sourceRepo);
  validation = runValidation(sourceRepo, command);
}

const endedAt = now();
const packet = {
  source_repo: sourceRepo || null,
  source_commit: sourceCommit || null,
  source_git_status: sourceGitStatus || null,
  source_validator: "msp_validate",
  command,
  exit_code: validation.exitCode,
  started_at: startedAt,
  ended_at: endedAt,
  validated_source_artifacts: artifacts,
  msp_result: missingEvidence.length > 0 ? "not_run" : validation.exitCode === 0 ? "pass" : "fail",
  msp_warnings: [
    ...missingEvidence,
    ...warningLines(validation),
  ],
  msp_output_excerpt: outputExcerpt(validation),
  govibe_taxonomy_mapping: taxonomyMapping(),
  unmapped_governance_concepts: unmappedConcepts(),
  govibe_impact: "MSP evidence is source consistency evidence only; GoVibe docs:validate, diff:check, and baseline:check remain final GoVibe gates.",
  recommended_decision: decisionFor({ missingEvidence, exitCode: validation.exitCode }),
  confidence: confidenceFor({ missingEvidence, exitCode: validation.exitCode, sourceGitStatus }),
};

console.log(toYaml(packet));
