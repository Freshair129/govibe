import { realpath } from "node:fs/promises";
import path from "node:path";

import { buildContinueForwardingArgs } from "./continue-forwarding.mjs";
import {
  assertPolicyAllows, continueWorkflow, createPolicyEnvelope, createWorkflowPlan, docsVersion, getWorkflowStatus, validateContextAuthorityCorrelation,
  initializeWorkspace, optimizeMeasured, readSkillDefinition, reviewWorkspace, scanWorkspace, transitionWorkflow, workspaceImpact,
} from "../../../packages/govibe-core/src/index.mjs";
// TASK-PRD-007 (D1): the wire-protocol bound belongs here, not inside packages/govibe-core --
// this file is scripts/mcp/runtime/, where MISSION_PROTOCOL_LIMITS is legitimately in scope.
// packages/govibe-core/package.json declares no dependency on @govibe/mission-protocol.
import { MISSION_PROTOCOL_LIMITS } from "../../../packages/mission-protocol/index.js";

async function resolveWorkspace(workspacePath, allowedRoots) {
  if (!workspacePath || !path.isAbsolute(workspacePath)) throw new Error("workspacePath must be an absolute caller-declared root.");
  const target = await realpath(path.normalize(workspacePath));
  const roots = await Promise.all(allowedRoots.map((root) => realpath(path.normalize(root))));
  const targetKey = process.platform === "win32" ? target.toLowerCase() : target;
  const allowed = roots.some((root) => { const rootKey = process.platform === "win32" ? root.toLowerCase() : root; const relative = path.relative(rootKey, targetKey); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); });
  if (!allowed) throw new Error("workspacePath is outside configured GoVibe roots.");
  return target;
}

function missionRun(result) {
  const stageRuns = result.stageRuns?.map((stage) => ({ stage: stage.stage, name: stage.name, status: stage.status, method: stage.method, confidence: stage.confidence, outputRefs: stage.outputRefs, error: stage.error }));
  return { runId: result.runId, status: result.status, currentTask: result.status === "complete" ? null : stageRuns?.find((stage) => stage.status !== "complete" && stage.status !== "not_applicable")?.name ?? null, tasks: stageRuns?.map((stage) => ({ id: `stage-${stage.stage}`, status: stage.status, outputRefs: stage.outputRefs })) ?? [], kind: "scan", level: result.level, stageRuns, graphValidation: result.graphValidation ? { passed: result.graphValidation.passed, errors: result.graphValidation.errors } : undefined };
}

// TASK-PRD-007: maps deep-scan OBSERVED candidates (packages/govibe-core/src/scan/stage-runner.mjs
// runDeepScan()'s `observed` field -- CLAUDE.md is explicit that these are observed candidates,
// not canonical GKS truth) onto the exact MissionSnapshot.graph/.symbols contract in
// src/mission/domain.ts. Never adds fields beyond that contract.
function observedNodeLabel(node) {
  const props = node?.props ?? {};
  if (typeof props.name === "string" && props.name) return props.name;
  if (typeof props.title === "string" && props.title) return props.title;
  if (typeof props.path === "string" && props.path) return props.path;
  return node.id;
}

// Stage 8 (orm-schema-parser, stage-adapters.mjs) discovers `OrmModel` nodes with
// `props.name`/`props.path` -- the only observed candidates that genuinely represent database
// schema entities rather than TypeScript source symbols. DatabaseErdView filters snapshot.symbols
// down to this kind so it never renders functions/classes as db tables again (TASK-PRD-007
// defect 1).
const ORM_MODEL_SYMBOL_KIND = "orm-model";

function isOrmModelNode(node) {
  return Array.isArray(node?.labels) && node.labels.includes("OrmModel");
}

function dedupeById(items) {
  const seen = new Map();
  let duplicatesDropped = 0;
  for (const item of items) {
    if (seen.has(item.id)) { duplicatesDropped += 1; continue; }
    seen.set(item.id, item);
  }
  return { items: [...seen.values()], duplicatesDropped };
}

// TASK-PRD-007 (B8, round 3): the dedup key used to be `${item.name}\u0000${item.path}` only --
// two DIFFERENT symbols that merely share a name and file (e.g. a `run()` method on class A and
// another `run()` method on class B in the same file) collapsed into ONE published entry. The
// graph published 1,500 distinct `symbol:` nodes (deduped by id, which includes a byte offset)
// while snapshot.symbols published 1,472 for the SAME scan -- the two slices described different
// populations, and the terminal called this loss "deduped 28 duplicate symbol(s)". `kind` and
// `position` (the symbol's source line, when the candidate carries one -- TS symbols do, ORM
// model matches don't) are folded into the key so two real, distinct declarations are never
// merged, while genuinely identical candidates (F5b: two OrmModel matches for the same renamed
// table, both `{name, path, kind}` with no position) still collapse to one as before. `position`
// is used for keying ONLY -- it is never added to the returned item, so the published
// `{name, path, kind}` shape (src/mission/domain.ts's `symbols` contract) is unchanged.
function dedupeSymbols(items) {
  const seen = new Set();
  const deduped = [];
  let duplicatesDropped = 0;
  for (const { name, path: symbolPath, kind, position } of items) {
    const key = `${name}\u0000${symbolPath}\u0000${kind}\u0000${position ?? ""}`;
    if (seen.has(key)) { duplicatesDropped += 1; continue; }
    seen.add(key);
    deduped.push({ name, path: symbolPath, kind });
  }
  return { items: deduped, duplicatesDropped };
}

// TASK-PRD-007 (D1 finding #5): the published payload's wire-protocol bound is asserted HERE --
// after mapping/dedup, on what is actually about to be published -- not as a magic-number cap on
// the pre-mapping accumulator (which is what let the old code publish up to 2x its stated cap by
// concatenating observed.nodes with observed.symbols with no shared limit).
//
// TASK-PRD-007 (round 5): the item count was never the bound that actually binds. isMissionEvent()
// gates a `graph.update` through isBoundedRecord() -> isBoundedJson(), i.e.
// MISSION_PROTOCOL_LIMITS.eventBytes (1,000,000 SERIALIZED bytes) -- and the same ceiling applies
// to the {type:"snapshot"} frame carrying graph AND symbols. A measured deep scan of this
// repository publishes 3,540 nodes / 2,633 edges as a 667,348-byte `graph.update`, and an
// 869,491-byte {type:"snapshot"} frame carrying that same graph plus 194,582 bytes of symbols --
// 87% of the ceiling while sitting at ~35% of the 10,000-item cap. Nothing here bounded
// bytes, so a repository ~15% larger (or one with longer paths) silently blackholes its own
// update: isMissionEvent returns false, sidecar-server.mjs drops the event with a generic
// warning, and no client ever sees a graph refresh.
//
// So both bounds are enforced, and both report through the same `droppedByWireBound` counter.
const ARRAY_ENVELOPE_BYTES = 2; // "[]"
const ARRAY_SEPARATOR_BYTES = 1; // ","

// The deep-scan-produced slices (graph.nodes, graph.edges, symbols) share one byte budget because
// they share one wire frame: the initial {type:"snapshot"} frame carries all three, and it is the
// EARLIER of the two ceilings to break (869,491 bytes against graph.update's 667,348 on this
// repository, since the snapshot is a strict superset of the graph). Reserving 10% of eventBytes
// leaves ~100,000 bytes of headroom for the rest of the snapshot -- every non-scan slice combined
// measures 7,562 bytes today -- plus each frame's own envelope (32 bytes for a `graph.update`,
// 19 for the `graph` object). The budget is deliberately above what this repository currently
// publishes: it must bite only when a payload would genuinely be dropped, never truncate a graph
// that renders correctly today.
export const SCAN_SLICE_WIRE_BYTE_BUDGET = Math.floor(MISSION_PROTOCOL_LIMITS.eventBytes * 0.9);

function serializedByteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function boundByItemCount(items) {
  return items.length <= MISSION_PROTOCOL_LIMITS.arrayItems ? items : items.slice(0, MISSION_PROTOCOL_LIMITS.arrayItems);
}

// Max-min fair share ("water filling"): a claimant that already fits inside an equal share keeps
// all of it and releases the remainder, which is re-shared among the ones that do not. Without
// this, filling the arrays in declaration order would let nodes consume the whole budget and
// publish a node cloud with zero edges. Deterministic and order-independent.
function shareByteBudget(sizes, budget) {
  const shares = new Array(sizes.length).fill(0);
  let remaining = budget;
  let pending = sizes.map((size, index) => ({ size, index }));
  while (pending.length > 0) {
    const fairShare = Math.floor(remaining / pending.length);
    const fitting = pending.filter((claimant) => claimant.size <= fairShare);
    if (fitting.length === 0) {
      for (const claimant of pending) shares[claimant.index] = fairShare;
      break;
    }
    for (const claimant of fitting) { shares[claimant.index] = claimant.size; remaining -= claimant.size; }
    pending = pending.filter((claimant) => claimant.size > fairShare);
  }
  return shares;
}

// `droppedByWireBound` is one counter for both bounds on purpose: from the operator's side the
// fact that matters is "the wire protocol would not carry these, so they were not published", and
// the warning names both bounds. `items` is already the deduped, publishable population, so
// numerator (kept) and denominator (items.length) describe the same population by construction.
function boundForWire(items, byteBudget) {
  const countBounded = boundByItemCount(items);
  const kept = [];
  let usedBytes = ARRAY_ENVELOPE_BYTES;
  for (const item of countBounded) {
    const cost = serializedByteLength(item) + (kept.length > 0 ? ARRAY_SEPARATOR_BYTES : 0);
    if (usedBytes + cost > byteBudget) break;
    usedBytes += cost;
    kept.push(item);
  }
  return { items: kept, droppedByWireBound: items.length - kept.length };
}

// Stage 5 emits unresolved call candidates with `to: null`, and some edges may still reference
// ids that were never published (e.g. capped out of the observed accumulator, or -- since round 5
// -- dropped by the wire bound above) -- rendering either would put a dangling/`null` reference on
// screen, which the no-fabrication rule forbids. Keep only edges whose endpoints are both in the
// published node set.
function publishableEdges(edges, nodeIds) {
  const endpointValid = edges.filter((edge) => edge?.from != null && edge?.to != null && nodeIds.has(edge.from) && nodeIds.has(edge.to));
  const { items, duplicatesDropped } = dedupeById(endpointValid.map((edge) => ({ id: `${edge.from}\u0000${edge.to}`, source: edge.from, target: edge.to })));
  return {
    items: items.map(({ source, target }) => ({ source, target })),
    droppedByEndpointFilter: edges.length - endpointValid.length,
    duplicatesDropped,
  };
}

// TASK-PRD-007 (F2, F5b): maps deep-scan OBSERVED candidates (packages/govibe-core/src/scan/
// stage-runner.mjs runDeepScan()'s `observed` field -- CLAUDE.md is explicit that these are
// observed candidates, not canonical GKS truth) onto the exact MissionSnapshot.graph/.symbols
// contract in src/mission/domain.ts. Never adds fields beyond that contract to `nodes`/`edges`/
// `symbols` themselves; `diagnostics` is a sibling field for the caller's own reporting, not part
// of the published shape.
//
// Also dedupes what is actually published (F5b): stage 3 can emit both a WIKILINK and a
// REFERENCES edge for the same file pair, and stage 9 an IMPORTS edge over the same pair --
// mapping drops `rel`, so these would otherwise become byte-identical published {source,target}
// duplicates. Stage 7 emits `id: tool:${text}`, so the same tool string in multiple files yields
// duplicate node ids. Stage 8 can emit two OrmModel matches with an identical {name,path}. All
// three are deduped here, on the final published shape.
export function mapObservedGraph(observed) {
  // Publish observed TypeScript symbols (stage 5) as graph nodes too, id-matched to what
  // CALLS/INHERITS edges already reference (`symbol:<path>:<pos>`) -- otherwise every such edge
  // fails the endpoint check below and the call graph renders zero edges (TASK-PRD-007 defect 2).
  const rawNodes = [
    ...observed.nodes.map((node) => ({ id: node.id, label: observedNodeLabel(node) })),
    ...observed.symbols.map((symbol) => ({ id: symbol.id, label: symbol.name })),
  ];
  const { items: dedupedNodes, duplicatesDropped: nodeDuplicatesDropped } = dedupeById(rawNodes);

  // TASK-PRD-007 (B8, round 3): `position` (stage-adapters.mjs's TS symbol candidates carry
  // `line`) is passed through to dedupeSymbols() as a dedup-key discriminator only -- it is never
  // part of the published `{name, path, kind}` shape (dedupeSymbols() strips it before returning).
  const rawSymbols = [
    ...observed.symbols.map((symbol) => ({ name: symbol.name, path: symbol.path, kind: symbol.kind, position: symbol.line ?? null })),
    ...observed.nodes.filter(isOrmModelNode).map((node) => ({ name: node.props.name, path: node.props.path, kind: ORM_MODEL_SYMBOL_KIND, position: null })),
  ];
  const { items: dedupedSymbols, duplicatesDropped: symbolDuplicatesDropped } = dedupeSymbols(rawSymbols);

  // TASK-PRD-007 (round 5): the three slices are sized against the shared byte budget BEFORE any
  // of them is bounded, so one slice cannot starve another. Edges are sized against the deduped
  // (pre-node-bound) node set; the finally published edge set is a subset of that, so the share
  // computed here is always sufficient for it.
  const provisionalEdges = publishableEdges(observed.edges, new Set(dedupedNodes.map((node) => node.id)));
  const [nodeByteBudget, edgeByteBudget, symbolByteBudget] = shareByteBudget(
    [dedupedNodes, provisionalEdges.items, dedupedSymbols].map((items) => serializedByteLength(boundByItemCount(items))),
    SCAN_SLICE_WIRE_BYTE_BUDGET,
  );

  const { items: nodes, droppedByWireBound: nodesDroppedByWireBound } = boundForWire(dedupedNodes, nodeByteBudget);

  // The endpoint filter runs against the FINAL published node set, not the pre-bound one: a node
  // the wire bound drops must take its edges with it, or the published graph would carry edges
  // pointing at ids no client can resolve. (Before round 5 this ran against the pre-bound set --
  // latent only because no fixture had ever reached a bound.)
  const { items: publishedEdges, droppedByEndpointFilter: edgesDroppedByEndpointFilter, duplicatesDropped: edgeDuplicatesDropped } =
    publishableEdges(observed.edges, new Set(nodes.map((node) => node.id)));

  const { items: edges, droppedByWireBound: edgesDroppedByWireBound } = boundForWire(publishedEdges, edgeByteBudget);
  const { items: symbols, droppedByWireBound: symbolsDroppedByWireBound } = boundForWire(dedupedSymbols, symbolByteBudget);

  return {
    nodes,
    edges,
    symbols,
    diagnostics: {
      edgesDroppedByEndpointFilter,
      nodeDuplicatesDropped,
      edgeDuplicatesDropped,
      symbolDuplicatesDropped,
      nodesDroppedByWireBound,
      edgesDroppedByWireBound,
      symbolsDroppedByWireBound,
    },
  };
}

export class WorkspaceService {
  constructor(options) { Object.assign(this, options); }
  async target(value) { return resolveWorkspace(value, this.allowedRoots); }
  publishRun(run) { const snapshot = this.snapshotStore.getSnapshot(); this.snapshotStore.patch({ workflowRuns: [...snapshot.workflowRuns.filter((item) => item.runId !== run.runId), run] }); this.snapshotStore.emit({ type: "workflow.run", run }); }
  async initialize(args = {}) {
    const target = await this.target(args.workspacePath);
    const builtInSkill = await readSkillDefinition(path.join(this.workspaceRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"));
    const result = await initializeWorkspace({ workspacePath: target, builtInSkill, mspClient: this.mspClient, actor: args.actor ?? "unknown" });
    this.snapshotStore.appendTerminal("sys", "GoVibe workspace prepared.");
    return result;
  }
  async continue(args = {}) {
    const target = await this.target(args.workspacePath);
    if (args.runId && args.taskId && args.status) {
      const event = await transitionWorkflow({ workspacePath: target, runId: args.runId, taskId: args.taskId, status: args.status, idempotencyKey: args.idempotencyKey, verification: args.verification, outputRefs: args.outputRefs });
      const run = await getWorkflowStatus({ workspacePath: target, runId: args.runId }); this.publishRun(run); return { status: run.status, event, run };
    }
    validateContextAuthorityCorrelation(args.contextAuthority, { workspaceId: args.workspaceId, agentId: args.agentId, runId: args.runId, sessionId: args.sessionId, turnId: args.turnId, parentContextId: args.parentContextId, knowledgeRefs: args.knowledgeRefs });
    const builtInSkill = await readSkillDefinition(path.join(this.workspaceRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"));
    const result = await continueWorkflow(buildContinueForwardingArgs(args, target, this.mspClient, [builtInSkill.contentHash]));
    this.snapshotStore.appendTerminal(result.status === "ready" ? "sys" : "warn", `GoVibe continue ${result.status}.`); return result;
  }
  async createPlan(args = {}) { const result = await createWorkflowPlan({ workspacePath: await this.target(args.workspacePath), runId: args.runId, tasks: args.tasks, policyEnvelope: createPolicyEnvelope(args.mode ?? "codev", args.actor ?? "unknown") }); this.publishRun(result); return result; }
  async status(args = {}) { const result = await getWorkflowStatus({ workspacePath: await this.target(args.workspacePath), runId: args.runId }); const snapshot = this.snapshotStore.getSnapshot(); this.snapshotStore.patch({ workflowRuns: [...snapshot.workflowRuns.filter((run) => run.runId !== result.runId), result] }); return result; }
  async impact(args = {}) { return workspaceImpact({ workspacePath: await this.target(args.workspacePath), paths: args.paths ?? [] }); }
  async version(args = {}) { return docsVersion({ workspacePath: await this.target(args.workspacePath), path: args.path }); }
  async review(args = {}) { return reviewWorkspace({ workspacePath: await this.target(args.workspacePath) }); }
  async optimize(args = {}) { assertPolicyAllows(createPolicyEnvelope(args.mode ?? "covibe", args.actor ?? "unknown"), "optimize"); if (args.strategy !== "deduplicate_strings" || !Array.isArray(args.values)) throw new Error("Unsupported optimize strategy."); let output = [...args.values]; const result = await optimizeMeasured({ measureBefore: async () => args.values.length, optimize: async () => { output = [...new Set(args.values)]; }, measureAfter: async () => output.length }); return { ...result, strategy: args.strategy, output }; }
  async scan(args = {}) {
    const result = await scanWorkspace({ workspacePath: await this.target(args.workspacePath), deep: args.deep === true, mspClient: this.mspClient, gksClient: this.gksClient, actor: args.actor ?? "unknown", runId: args.runId, resume: args.resume === true });
    const run = missionRun(result);
    this.publishRun(run);
    // TASK-PRD-007 (round 6, review finding 1): an UNEXPECTED git failure (git absent, dubious
    // ownership / safe.directory, a corrupt repository, a buffer overrun) makes scan.mjs fall back
    // to a plain directory walk, which admits every path the repository's ignore rules were
    // keeping out. Measured on this repository: 923 -> 1737 files, including a vendored checkout
    // of a foreign project under ref/ whose .md/.ts CONTENT is then read and decomposed, plus
    // scripts/bench/ (which .gitignore annotates as holding real customer/account mapping data)
    // and .env. scan.mjs already emits a console.warn, but stderr is a log, not an operator or
    // audit surface -- AGENTS.md section 10 is "Escalate, Do Not Widen", and this same method
    // already routes strictly less severe events (dedup counts, wire-bound drops) to the Terminal
    // below. The two EXPECTED reasons (not a git work tree, workspace is not the git toplevel) are
    // normal operation and stay quiet.
    if (typeof result.inventoryModeReason === "string" && /^git-(not-on-path|command-failed)/.test(result.inventoryModeReason)) {
      this.snapshotStore.appendTerminal(
        "warn",
        `GoVibe scan inventory widened to a fallback directory walk after an unexpected git failure: inventoryMode=${result.inventoryMode}, reason=${result.inventoryModeReason}. The repository's ignore rules did NOT constrain this inventory, so paths they exclude may have been decomposed and submitted to MSP.`,
      );
    }
    // A non-deep (L1) scan has no observed graph -- publishing nothing here is what keeps the
    // six graph/symbol views (AstTreeView, GraphStudioView, GraphView, HnswVectorView,
    // SymbolExplorerView, DatabaseErdView) in their honest empty state until a real deep scan runs.
    if (result.observed) {
      const graph = mapObservedGraph(result.observed);
      this.snapshotStore.patch({ graph: { nodes: graph.nodes, edges: graph.edges }, symbols: graph.symbols });
      this.snapshotStore.emit({ type: "graph.update", graph: { nodes: graph.nodes, edges: graph.edges } });

      // TASK-PRD-007 (F2): report the TRUE PUBLISHED counts -- post-mapping, post-endpoint-filter,
      // post-dedup, post-wire-bound (graph.nodes/.edges/.symbols) -- never the pre-mapping
      // accumulator length. The accumulator can hold edges whose endpoints never made it into the
      // published node set (capped out by a different stage's quota, scratch-excluded, or simply
      // unresolved), so its raw length can overstate what actually reached Mission Control -- this
      // repo's own scan used to report "29/29 edges" here while publishing zero.
      //
      // TASK-PRD-007 (round 4, M3): the numerator/denominator pairs here must describe the SAME
      // population, or the ratio is not a real number. `graph.nodes` (numerator) is
      // dedupe(observed.nodes UNION observed.symbols) -- ever since defect-2's fix, a TypeScript
      // symbol is published as BOTH a graph node (so CALLS/INHERITS edges resolve) and a `symbols`
      // entry. So the coherent "nodes" denominator is `totals.nodes + totals.symbols` (every
      // candidate that could have become a graph node), not `totals.nodes` alone -- comparing
      // against `totals.nodes` alone (round 3's formula) measured "3535/5890 nodes" on this repo
      // while `totals.nodes` genuinely only covered part of what `graph.nodes` counts.
      // Symmetrically, `graph.symbols` (numerator) is TypeScript symbols PLUS Stage 8 OrmModel
      // node candidates projected into the symbols contract (isOrmModelNode()) -- so the coherent
      // "symbols" denominator is `totals.symbols + totals.ormModelNodes`, not `totals.symbols`
      // alone; comparing against `totals.symbols` alone is exactly what produced the inverted
      // "1996/1981 symbols" warning (numerator counting OrmModel projections the denominator never
      // included). `edges` was already coherent (both sides count edge candidates) and is
      // unchanged.
      if (result.observed.truncated) {
        const { totals } = result.observed;
        const nodeCandidateTotal = totals.nodes + totals.symbols;
        const symbolCandidateTotal = totals.symbols + (totals.ormModelNodes ?? 0);
        this.snapshotStore.appendTerminal(
          "warn",
          `GoVibe deep scan observed graph capped: published ${graph.nodes.length}/${nodeCandidateTotal} graph nodes (file/directory/tool/etc. candidates plus typescript symbols), ${graph.edges.length}/${totals.edges} edges, ${graph.symbols.length}/${symbolCandidateTotal} symbols (typescript symbols plus ORM schema candidates) to Mission Control. True totals are recorded in stage evidence; the excess candidates were dropped, not fabricated.`,
        );
      }

      // TASK-PRD-007 (F2): silent drops are forbidden. Report edges dropped by the endpoint
      // filter every time it happens -- independently of whether the accumulator itself was
      // truncated, since an edge can lose its endpoint to a different stage's quota, a scratch
      // exclusion, or an unresolved candidate even on an untruncated run.
      const {
        edgesDroppedByEndpointFilter,
        nodeDuplicatesDropped,
        edgeDuplicatesDropped,
        symbolDuplicatesDropped,
        nodesDroppedByWireBound,
        edgesDroppedByWireBound,
        symbolsDroppedByWireBound,
      } = graph.diagnostics;
      if (edgesDroppedByEndpointFilter > 0) {
        this.snapshotStore.appendTerminal(
          "warn",
          `GoVibe deep scan graph: ${edgesDroppedByEndpointFilter} edge candidate(s) dropped -- endpoint node was not in the published set (unresolved candidate, the endpoint's own stage quota/scratch exclusion dropped it, or the wire bound below dropped the endpoint node itself). Not rendered as a dangling reference.`,
        );
      }
      if (nodeDuplicatesDropped > 0 || edgeDuplicatesDropped > 0 || symbolDuplicatesDropped > 0) {
        this.snapshotStore.appendTerminal(
          "sys",
          `GoVibe deep scan graph: deduped ${nodeDuplicatesDropped} duplicate node id(s), ${edgeDuplicatesDropped} duplicate edge(s), ${symbolDuplicatesDropped} duplicate symbol(s) before publishing.`,
        );
      }
      // TASK-PRD-007 (round 4, M3): `nodesDroppedByWireBound`/`edgesDroppedByWireBound`/
      // `symbolsDroppedByWireBound` were already computed by mapObservedGraph() but never
      // destructured or reported here -- silent drops are forbidden by the same rule the two
      // warnings above exist to satisfy.
      if (nodesDroppedByWireBound > 0 || edgesDroppedByWireBound > 0 || symbolsDroppedByWireBound > 0) {
        this.snapshotStore.appendTerminal(
          "warn",
          `GoVibe deep scan graph: wire-protocol limit dropped ${nodesDroppedByWireBound} node(s), ${edgesDroppedByWireBound} edge(s), ${symbolsDroppedByWireBound} symbol(s) before publishing (MISSION_PROTOCOL_LIMITS.arrayItems item cap, and a shared ${SCAN_SLICE_WIRE_BYTE_BUDGET}-byte serialized-size budget against MISSION_PROTOCOL_LIMITS.eventBytes -- the bound isMissionEvent actually enforces). Not fabricated -- the true, pre-bound counts are the dedup stage's own output, above.`,
        );
      }
    }
    this.snapshotStore.appendTerminal(result.status === "complete" ? "sys" : "warn", `GoVibe ${result.level} scan ${result.status}.`);
    return result;
  }
}
