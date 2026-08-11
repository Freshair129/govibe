import path from "node:path";
import ts from "typescript";

import { byCodepoint, parseAll, parsableSources, positionOf, semanticScope, sortById, uniqueBy } from "./stage-shared.mjs";

/**
 * Stage 7 — Behavioural & Execution Scan
 * Stage 8 — State & Decision Scan
 * Stage 9 — Cross-Cutting Concern Scan
 *
 * These are the three stages the specification marks "parser + inference". This tranche ships
 * the parser half only; no LLM tier is wired. Every one of them therefore reports what is
 * observable and names what it cannot establish, rather than producing a plausible model of
 * behaviour, state, or architecture. That is the `UNRESOLVED`-over-fabrication rule applied
 * where it is most tempting to break.
 */

const STATUS_NAME = /(status|state|phase|stage|kind|type|mode)$/i;

/** Stage 7 — entrypoints from repository metadata, then module-level reachability. */
const stage07 = {
  stage: 7,
  extractorVersion: "1.0.0",
  method: "entrypoint-metadata-and-module-reachability",
  usesTreeShape: true,
  inputs: (files) => files.filter((file) => path.posix.basename(file.path) === "package.json").map((file) => file.path),
  async run({ files, artifacts, read }) {
    const scope = semanticScope({ artifacts, files });
    const manifests = files.filter((file) => scope.has(file.path) && path.posix.basename(file.path) === "package.json");
    const dependencyGraph = artifacts.get(4);

    if (!manifests.length && !dependencyGraph) {
      return { status: "not_applicable", confidence: 1, exclusions: ["inventory_contains_no_entrypoint_sources"], artifact: null };
    }

    const entrypoints = [];
    const unresolved = [];

    for (const manifest of manifests) {
      let json;
      try {
        json = JSON.parse(await read(manifest.path));
      } catch (error) {
        unresolved.push({ kind: "unparsed-manifest", path: manifest.path, reason: String(error?.message ?? error) });
        continue;
      }
      const directory = path.posix.dirname(manifest.path) === "." ? "" : `${path.posix.dirname(manifest.path)}/`;
      const resolve = (target) => `${directory}${String(target).replace(/^\.\//, "")}`;
      if (json.main) entrypoints.push({ id: `mode2-entrypoint:main:${resolve(json.main)}`, kind: "module-main", target: resolve(json.main), path: manifest.path });
      const bin = typeof json.bin === "string" ? { [json.name ?? "default"]: json.bin } : json.bin ?? {};
      for (const [name, target] of Object.entries(bin)) {
        entrypoints.push({ id: `mode2-entrypoint:bin:${name}`, kind: "cli", name, target: resolve(target), path: manifest.path });
      }
      for (const [name, command] of Object.entries(json.scripts ?? {})) {
        entrypoints.push({ id: `mode2-entrypoint:script:${name}`, kind: "npm-script", name, command, path: manifest.path });
      }
    }

    // Module-level reachability over the Stage 4 IMPORTS edges. This is a genuine traversal,
    // not a guess — but it is module granularity only. Symbol-level request/command/event
    // flow needs a call graph, and Mode 2 Stage 3 does not emit call edges in this tranche.
    const adjacency = new Map();
    for (const edge of dependencyGraph?.edges ?? []) {
      if (edge.rel !== "IMPORTS") continue;
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from).push(edge.to);
    }
    const moduleIds = new Set((artifacts.get(3)?.modules ?? []).map((module) => module.id));
    const roots = entrypoints
      .filter((entry) => entry.target)
      .map((entry) => `mode2-module:${entry.target}`)
      .filter((id) => moduleIds.has(id));

    const reachable = new Set();
    const queue = [...roots];
    while (queue.length) {
      const current = queue.shift();
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const next of adjacency.get(current) ?? []) queue.push(next);
    }
    const unreachable = [...moduleIds].filter((id) => !reachable.has(id)).sort(byCodepoint);

    if (!roots.length && moduleIds.size) {
      unresolved.push({ kind: "no-resolvable-entrypoint-module", detail: "manifest entrypoints did not resolve to a parsed module; reachability not computed" });
    }
    unresolved.push({
      kind: "symbol-level-flow-not-recovered",
      detail: "request/command/event flows need a call graph; Stage 3 emits no call edges in this tranche",
    });

    return {
      status: "incomplete",
      error: "behaviour_recovered_at_module_granularity_only",
      confidence: moduleIds.size === 0 ? 0 : Number((reachable.size / moduleIds.size).toFixed(4)),
      unresolved,
      artifact: {
        schema: "govibe-mode2-behaviour-model/v1",
        granularity: "module",
        entrypoints: sortById(uniqueBy(entrypoints, (item) => item.id)),
        reachable_modules: [...reachable].sort(byCodepoint),
        unreachable_modules: unreachable,
        execution_paths: [],
      },
    };
  },
};

function classifyBranch(node, source) {
  const text = node.getText(source);
  if (ts.isCatchClause(node.parent) || /\bthrow\b/.test(text.slice(0, 200))) return "error-handling";
  if (/\b(invalid|validate|assert|require|missing|malformed|isValid)\b/i.test(text.slice(0, 200))) return "validation";
  return "unknown";
}

/** Stage 8 — state shapes and branch inventory. Business intent is never inferred. */
const stage08 = {
  stage: 8,
  extractorVersion: "1.0.0",
  method: "typescript-ast-state-and-branch-inventory",
  usesTreeShape: false,
  inputs: (files) => files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i.test(file.path)).map((file) => file.path),
  async run({ files, artifacts, read }) {
    const candidates = parsableSources({ files, artifacts, includeTests: false });
    if (!candidates.length) {
      return { status: "not_applicable", confidence: 1, exclusions: ["inventory_contains_no_stateful_source"], artifact: null };
    }

    const { parsed, unresolved } = await parseAll({ candidates, read });
    const stateShapes = [];
    const transitions = [];
    const branches = [];

    for (const { file, source } of parsed) {
      const walkNode = (node) => {
        if (ts.isEnumDeclaration(node) && node.name && STATUS_NAME.test(node.name.text)) {
          stateShapes.push({
            id: `mode2-state:${file.path}:${node.name.text}`,
            name: node.name.text,
            form: "enum",
            values: node.members.map((member) => (member.name && ts.isIdentifier(member.name) ? member.name.text : null)).filter(Boolean),
            path: file.path,
            source_span: positionOf(node, source),
          });
        }
        if (ts.isTypeAliasDeclaration(node) && node.name && STATUS_NAME.test(node.name.text) && ts.isUnionTypeNode(node.type)) {
          const values = node.type.types
            .filter((member) => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal))
            .map((member) => member.literal.text);
          if (values.length) {
            stateShapes.push({
              id: `mode2-state:${file.path}:${node.name.text}`,
              name: node.name.text,
              form: "string-union",
              values,
              path: file.path,
              source_span: positionOf(node, source),
            });
          }
        }
        if (ts.isSwitchStatement(node)) {
          const discriminant = node.expression.getText(source);
          const labels = node.caseBlock.clauses
            .filter((clause) => ts.isCaseClause(clause) && (ts.isStringLiteral(clause.expression) || ts.isPropertyAccessExpression(clause.expression)))
            .map((clause) => clause.expression.getText(source).replace(/^["']|["']$/g, ""));
          if (labels.length && STATUS_NAME.test(discriminant.split(/[.\s]/).pop() ?? "")) {
            transitions.push({
              id: `mode2-transition:${file.path}:${positionOf(node, source).start}`,
              discriminant,
              labels,
              path: file.path,
              source_span: positionOf(node, source),
              candidate: true,
            });
          }
          branches.push({
            id: `mode2-branch:${file.path}:${positionOf(node, source).start}`,
            form: "switch",
            classification: "routing",
            path: file.path,
            source_span: positionOf(node, source),
          });
        }
        if (ts.isIfStatement(node)) {
          branches.push({
            id: `mode2-branch:${file.path}:${positionOf(node, source).start}`,
            form: "if",
            classification: classifyBranch(node, source),
            path: file.path,
            source_span: positionOf(node, source),
          });
        }
        ts.forEachChild(node, walkNode);
      };
      walkNode(source);
    }

    const unknownBranches = branches.filter((branch) => branch.classification === "unknown");
    for (const branch of unknownBranches.slice(0, 200)) {
      unresolved.push({ kind: "unclassified-branch", path: branch.path, line: branch.source_span.line });
    }
    if (unknownBranches.length > 200) {
      unresolved.push({ kind: "unclassified-branch-overflow", detail: `${unknownBranches.length - 200} further unclassified branches not itemised` });
    }

    const counts = {};
    for (const branch of branches) counts[branch.classification] = (counts[branch.classification] ?? 0) + 1;

    return {
      status: "incomplete",
      error: "business_decision_classification_requires_inference",
      confidence: branches.length === 0 ? 1 : Number((1 - unknownBranches.length / branches.length).toFixed(4)),
      unresolved,
      artifact: {
        schema: "govibe-mode2-state-model/v1",
        state_shapes: sortById(uniqueBy(stateShapes, (item) => item.id)),
        transitions: sortById(uniqueBy(transitions, (item) => item.id)),
        branch_counts: Object.fromEntries(Object.entries(counts).sort(([left], [right]) => byCodepoint(left, right))),
        // Deterministic extraction cannot establish that a conditional encodes a business
        // rule. Emitting zero here is the honest result, not a coverage failure: the
        // specification forbids promoting a branch to a business decision without evidence.
        business_decisions: [],
        business_decision_note: "not derivable deterministically; requires the inference tier and human confirmation",
      },
    };
  },
};

const CONCERN_SIGNALS = {
  authentication: /\b(passport|next-auth|@auth\/|jsonwebtoken|jose|bcrypt|argon2|oauth|openid)\b/i,
  authorization: /\b(casbin|accesscontrol|@casl\/|rbac|abac|permissions?)\b/i,
  transactions: /\b(\$transaction|beginTransaction|withTransaction|BEGIN;)\b/,
  concurrency: /\b(worker_threads|cluster|Mutex|Semaphore|p-limit|async-mutex)\b/,
  logging: /\b(pino|winston|bunyan|loglevel|console\.(log|info|warn|error))\b/,
  audit: /\b(audit[-_]?(log|trail)|auditLog)\b/i,
  observability: /\b(@opentelemetry|prom-client|datadog|dd-trace|sentry)\b/i,
  caching: /\b(node-cache|lru-cache|ioredis|redis|@vercel\/kv|revalidate)\b/i,
  retry: /\b(p-retry|async-retry|retryPolicy|backoff|maxRetries)\b/i,
  idempotency: /\bidempotenc(y|e)[-_]?key|idempotencyKey\b/i,
  rate_limiting: /\b(rate[-_]?limit|express-rate-limit|bottleneck|throttle)\b/i,
  // `throw` counts: a module that raises is handling error paths even with no try/catch.
  error_handling: /(\btry\s*\{|\bcatch\s*\(|\.catch\(|\bthrow\s+new\b)/,
  resilience: /\b(circuit[-_]?breaker|opossum|bulkhead|fallback)\b/i,
};

/** Stage 9 — presence detection with evidence. Not an architecture recovery. */
const stage09 = {
  stage: 9,
  extractorVersion: "1.0.0",
  method: "cross-cutting-signal-presence-detection",
  usesTreeShape: false,
  inputs: (files) => files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|json)$/i.test(file.path)).map((file) => file.path),
  async run({ files, artifacts, read }) {
    const scope = semanticScope({ artifacts, files });
    const candidates = files.filter(
      (file) => scope.has(file.path) && /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|json)$/i.test(file.path),
    );
    if (!candidates.length) {
      return { status: "not_applicable", confidence: 1, exclusions: ["inventory_contains_no_concern_sources"], artifact: null };
    }

    const observations = [];
    const unresolved = [];
    for (const file of candidates) {
      let text;
      try {
        text = await read(file.path);
      } catch (error) {
        unresolved.push({ kind: "unreadable-source", path: file.path, reason: String(error?.message ?? error) });
        continue;
      }
      for (const [concern, pattern] of Object.entries(CONCERN_SIGNALS)) {
        const match = pattern.exec(text);
        if (!match) continue;
        observations.push({
          id: `mode2-concern:${concern}:${file.path}`,
          concern,
          path: file.path,
          evidence: match[0].slice(0, 60),
        });
      }
    }

    const present = [...new Set(observations.map((item) => item.concern))].sort(byCodepoint);
    const absent = Object.keys(CONCERN_SIGNALS).filter((concern) => !present.includes(concern)).sort(byCodepoint);

    return {
      status: "complete",
      confidence: candidates.length === 0 ? 1 : Number((1 - unresolved.length / candidates.length).toFixed(4)),
      unresolved,
      artifact: {
        schema: "govibe-mode2-concern-model/v1",
        claim: "presence-with-evidence",
        // Absence of a signal is absence of *this scanner's* signal, not proof the concern is
        // unhandled. Recorded so a coverage report cannot silently read it as a gap.
        absent_note: "an absent concern means no known signal matched, not that the concern is unimplemented",
        present,
        absent,
        counts: Object.fromEntries(present.map((concern) => [concern, observations.filter((item) => item.concern === concern).length])),
        observations: sortById(uniqueBy(observations, (item) => item.id)),
      },
    };
  },
};

export const behaviourStages = [stage07, stage08, stage09];
