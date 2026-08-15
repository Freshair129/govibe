import path from "node:path";

import { byCodepoint, sortById, uniqueBy } from "./stage-shared.mjs";

/**
 * Stage 11 — Agentic System Scan (mandatory)
 *
 * The goal is to understand an external agent system, never to replace it. GoVibe extracts the
 * semantics of another governor; it does not import its authority.
 *
 * This stage may never report `not_applicable` — the contract rejects that status for stage 11.
 * A repository with no agentic configuration produces an empty manifest carrying explicit
 * evidence of absence, because "we looked and found nothing" and "we did not look" must not be
 * indistinguishable downstream.
 */

const INSTRUCTION_FILES = [
  { path: "AGENTS.md", kind: "governor", client: "generic" },
  { path: "AGENT.md", kind: "agent-instruction", client: "generic" },
  { path: "CLAUDE.md", kind: "agent-instruction", client: "claude-code" },
  { path: "GEMINI.md", kind: "agent-instruction", client: "gemini-cli" },
  { path: ".cursorrules", kind: "agent-instruction", client: "cursor" },
];

const CONFIG_ROOTS = [
  { root: ".claude", client: "claude-code" },
  { root: ".gemini", client: "gemini-cli" },
  { root: ".agents", client: "generic" },
  { root: ".rwang", client: "rwang" },
  { root: ".govibe", client: "govibe" },
  { root: ".cursor", client: "cursor" },
];

/** Structural signals, each with the path family that proves it. */
const STRUCTURE_SIGNALS = [
  { capability: "skills", test: (p) => /(^|\/)skills\/[^/]+\/SKILL\.md$/i.test(p) || /(^|\/)skills\/[^/]+\/[^/]+\/SKILL\.md$/i.test(p) },
  { capability: "subagents", test: (p) => /(^|\/)agents\/[^/]+\.md$/i.test(p) },
  { capability: "commands", test: (p) => /(^|\/)commands\/[^/]+\.md$/i.test(p) },
  {
    capability: "mcp_servers",
    // A dedicated `.mcp.json` is one convention; agent settings files carrying an
    // `mcpServers` key are another and are the more common one in practice. Missing the
    // second made this repository — which is itself an MCP server — report no tool access.
    test: (p) => /(^|\/)\.mcp\.json$/i.test(p) || /(^|\/)mcp[-_]?servers?\.(json|ya?ml)$/i.test(p) || /(^|\/)\.(claude|gemini|cursor)\/settings(\.[a-z]+)?\.json$/i.test(p),
  },
  { capability: "hooks", test: (p) => /(^|\/)hooks?(\/|\.)/i.test(p) },
  { capability: "agent_registry", test: (p) => /agent-registry\.(ya?ml|json)$/i.test(p) },
  { capability: "policy", test: (p) => /(^|\/)(\.governance|policies|policy)(\/|$)/i.test(p) },
  { capability: "memory", test: (p) => /(^|\/)(MEMORY\.md|memory\/|\.brain\/)/i.test(p) },
  { capability: "session_logs", test: (p) => /(^|\/)session_logs?\//i.test(p) },
];

/**
 * §16 capability axes. `platform_capable` records what GoVibe itself can supply, so a MISSING
 * classification is actionable rather than merely negative.
 */
const CAPABILITY_AXES = [
  { axis: "agent_identity", signals: ["agent_registry", "subagents"], platform_capable: true },
  { axis: "role", signals: ["agent_registry"], platform_capable: true },
  { axis: "capability", signals: ["skills", "commands"], platform_capable: true },
  { axis: "tool_access", signals: ["mcp_servers"], platform_capable: true },
  { axis: "context_source", signals: ["instructions"], platform_capable: true },
  { axis: "context_boundary", signals: ["policy"], platform_capable: true },
  { axis: "memory", signals: ["memory"], platform_capable: true },
  { axis: "governor", signals: ["governor"], platform_capable: true },
  { axis: "permission", signals: ["policy", "hooks"], platform_capable: true },
  { axis: "task_lifecycle", signals: [], platform_capable: true },
  { axis: "handoff", signals: [], platform_capable: true },
  { axis: "model_routing", signals: [], platform_capable: true },
  { axis: "fallback", signals: [], platform_capable: true },
  { axis: "verification", signals: ["hooks"], platform_capable: true },
  { axis: "human_approval", signals: [], platform_capable: true },
  { axis: "audit", signals: ["session_logs"], platform_capable: true },
  { axis: "evidence", signals: ["session_logs"], platform_capable: true },
  { axis: "failure_recovery", signals: [], platform_capable: true },
];

function classify(external, platformCapable) {
  if (external && platformCapable) return "HYBRID";
  if (external) return "NATIVE";
  if (platformCapable) return "PLATFORM";
  return "MISSING";
}

const stage11 = {
  stage: 11,
  extractorVersion: "1.0.0",
  method: "agentic-configuration-discovery",
  usesTreeShape: true,
  inputs: (files) =>
    files
      .filter(
        (file) =>
          INSTRUCTION_FILES.some((entry) => entry.path === file.path) ||
          CONFIG_ROOTS.some((entry) => file.path.startsWith(`${entry.root}/`)),
      )
      .map((file) => file.path),
  async run({ adapter, files }) {
    // Deliberately NOT filtered through the Stage 2 semantic scope. Agent configuration lives
    // in dot-directories that a generated/vendor heuristic could plausibly exclude, and this
    // stage must see the whole tree to be able to assert absence.
    const paths = files.map((file) => file.path);
    const unresolved = [];

    const instructions = [];
    for (const declared of INSTRUCTION_FILES) {
      const found = files.find((file) => file.path === declared.path);
      instructions.push({
        id: `mode2-agent-instruction:${declared.path}`,
        path: declared.path,
        kind: declared.kind,
        client: declared.client,
        exists: Boolean(found),
        bytes: found?.size ?? 0,
      });
    }

    const configurations = [];
    for (const entry of CONFIG_ROOTS) {
      const members = paths.filter((candidate) => candidate === entry.root || candidate.startsWith(`${entry.root}/`));
      configurations.push({
        id: `mode2-agent-config:${entry.root}`,
        root: entry.root,
        client: entry.client,
        exists: members.length > 0,
        file_count: members.length,
      });
    }

    const observed = new Map();
    for (const signal of STRUCTURE_SIGNALS) {
      const evidence = paths.filter((candidate) => signal.test(candidate)).sort(byCodepoint);
      if (evidence.length) observed.set(signal.capability, evidence.slice(0, 20));
    }
    if (instructions.some((entry) => entry.exists)) {
      observed.set("instructions", instructions.filter((entry) => entry.exists).map((entry) => entry.path));
    }
    if (instructions.some((entry) => entry.exists && entry.kind === "governor")) {
      observed.set("governor", instructions.filter((entry) => entry.exists && entry.kind === "governor").map((entry) => entry.path));
    }

    const capabilities = CAPABILITY_AXES.map((entry) => {
      const matched = entry.signals.filter((signal) => observed.has(signal));
      const classification = classify(matched.length > 0, entry.platform_capable);
      return {
        axis: entry.axis,
        classification,
        external_evidence: matched.flatMap((signal) => observed.get(signal) ?? []).slice(0, 10),
      };
    });

    // Axes with no discoverable signal are honestly undetectable from the filesystem alone —
    // task lifecycle, handoff, model routing, fallback, human approval, and failure recovery
    // live in an agent's runtime behaviour, not in its file layout. They are recorded as
    // unresolved so a PLATFORM classification is not mistaken for "the external system lacks it".
    for (const entry of CAPABILITY_AXES.filter((item) => item.signals.length === 0)) {
      unresolved.push({
        kind: "capability-not-discoverable-from-filesystem",
        axis: entry.axis,
        detail: "runtime behaviour, not file layout; classification defaults to PLATFORM and must not be read as an external gap",
      });
    }

    const detectedClients = [
      ...new Set([
        ...instructions.filter((entry) => entry.exists).map((entry) => entry.client),
        ...configurations.filter((entry) => entry.exists).map((entry) => entry.client),
      ]),
    ]
      .filter((client) => client !== "generic")
      .sort(byCodepoint);

    const anythingFound = instructions.some((entry) => entry.exists) || configurations.some((entry) => entry.exists);
    let mcpConfig = null;
    if (observed.has("mcp_servers")) {
      const candidate = observed.get("mcp_servers")[0];
      try {
        const parsed = JSON.parse(await adapter.read(candidate));
        const servers = Object.keys(parsed.mcpServers ?? {}).sort(byCodepoint);
        mcpConfig = { path: candidate, servers };
        if (!servers.length) {
          unresolved.push({ kind: "mcp-config-declares-no-servers", path: candidate });
        }
      } catch (error) {
        unresolved.push({ kind: "unparsed-mcp-config", path: candidate, reason: String(error?.message ?? error) });
      }
    }

    return {
      status: "complete",
      confidence: 1,
      unresolved,
      artifact: {
        schema: "govibe-mode2-agent-capability-manifest/v1",
        // GoVibe reads this system to understand it. It does not adopt, override, or replace it.
        boundary: "external governor is analysed, never replaced",
        agentic_system_detected: anythingFound,
        absence_evidence: anythingFound
          ? null
          : `checked ${INSTRUCTION_FILES.length} instruction paths and ${CONFIG_ROOTS.length} configuration roots across ${paths.length} files; none present`,
        detected_clients: detectedClients,
        instructions: sortById(instructions),
        configurations: sortById(configurations),
        observed_capabilities: Object.fromEntries([...observed.entries()].sort(([left], [right]) => byCodepoint(left, right))),
        mcp: mcpConfig,
        capabilities: uniqueBy(capabilities, (item) => item.axis),
        classification_counts: ["NATIVE", "PLATFORM", "HYBRID", "MISSING"].reduce(
          (counts, key) => ({ ...counts, [key]: capabilities.filter((item) => item.classification === key).length }),
          {},
        ),
      },
    };
  },
};

export const agenticStages = [stage11];
