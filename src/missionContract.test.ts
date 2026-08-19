/**
 * Contract-drift guard: fails if the TS `TaskContainer` type and the runtime
 * roadmap-parser output diverge.
 *
 * Compile-time link: the `_keyCheck` constant is typed as
 * `Record<keyof TaskContainer, true>` so adding or removing a field in the TS
 * type causes a type-check failure here, forcing this file to be updated in
 * sync with the type.
 *
 * Runtime link: parse a real approved backlog source and assert that every key
 * the parser emits is declared in the contract key set, and every required key
 * is present on the first complete container.
 */

import { describe, expect, it } from "vitest";
import type { MissionSnapshot } from "./mission";
import type { TaskContainer } from "./mission";
// @ts-expect-error — .mjs module, no TS declaration
import { parseRoadmapSource } from "../scripts/mcp/roadmap-parser.mjs";
// @ts-expect-error — .mjs module, no TS declaration
import { createRuntimeSnapshot } from "../scripts/mcp/runtime/snapshot-store.mjs";
// Vite's `?raw` import (declared by the referenced vite/client types in vite-env.d.ts) loads the
// file's source as a plain string at build/test time — used below to pin the roadmap.dag rider
// without depending on Node's `fs` types, which this frontend project does not have installed.
import roadmapServiceSource from "../scripts/mcp/runtime/roadmap-service.mjs?raw";

// ---------------------------------------------------------------------------
// Compile-time key registry — MUST stay in sync with `TaskContainer` in mission.ts.
// Adding or removing a field in `TaskContainer` makes this object fail to type-check.
// ---------------------------------------------------------------------------
const _keyCheck: Record<keyof TaskContainer, true> = {
  task_container_id: true,
  task_id: true,
  legacy_task_id: true,
  legacy_code: true,
  parent_phase_id: true,
  parent_sprint_id: true,
  title: true,
  requirement_type: true,
  complexity: true,
  status: true,
  version: true,
  pic: true,
  executor: true,
  approver: true,
  auditor: true,
  assignee: true,
  completed_by: true,
  symbol_links: true,
  definition_of_done: true,
  changelog: true,
  created_at: true,
  last_update: true,
  token_telemetry: true,
  // "export" is a reserved word — bracket notation needed to reference the key;
  // the Record<keyof TaskContainer, true> type enforces it is present.
  export: true,
  ui_state: true,
  complete: true,
  missingFields: true,
};

// Suppress "unused variable" lint error — the object is only meaningful at
// type-check time; we never call it at runtime.
void _keyCheck;

// ---------------------------------------------------------------------------
// Runtime key sets — mirrors the TS type at the value level for runtime checks.
// ---------------------------------------------------------------------------

/** Every top-level key declared in `TaskContainer`. */
const EXPECTED_TOP_LEVEL_KEYS = new Set<string>([
  "task_container_id",
  "task_id",
  "legacy_task_id",
  "legacy_code",
  "parent_phase_id",
  "parent_sprint_id",
  "title",
  "requirement_type",
  "complexity",
  "status",
  "version",
  "pic",
  "executor",
  "approver",
  "auditor",
  "assignee",
  "completed_by",
  "symbol_links",
  "definition_of_done",
  "changelog",
  "created_at",
  "last_update",
  "token_telemetry",
  "export",
  "ui_state",
  "complete",
  "missingFields",
]);

/** Keys declared in `TaskContainer["symbol_links"]`. */
const EXPECTED_SYMBOL_LINKS_KEYS = new Set<string>(["code", "doc", "test"]);

/** Keys declared in `TaskContainer["definition_of_done"]`. */
const EXPECTED_DEFINITION_OF_DONE_KEYS = new Set<string>([
  "acceptance_criteria",
  "success_criteria",
  "exit_criteria",
]);

/** Keys declared in `TaskContainer["token_telemetry"]`. */
const EXPECTED_TOKEN_TELEMETRY_KEYS = new Set<string>([
  "model_name",
  "context_length",
  "predicted_token_usage",
  "actual_input_tokens",
  "actual_output_tokens",
  "tool_calling_tokens",
  "total_token_usage",
]);

/** Keys declared in `TaskContainer["export"]`. */
const EXPECTED_EXPORT_KEYS = new Set<string>(["json", "yaml", "markdown"]);

/** Keys declared in `TaskContainer["ui_state"]`. */
const EXPECTED_UI_STATE_KEYS = new Set<string>([
  "dropdown_default",
  "expanded",
  "disabled_reason",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unexpectedKeys(actual: object, allowed: Set<string>): string[] {
  return Object.keys(actual).filter((k) => !allowed.has(k));
}

function missingKeys(actual: object, required: Set<string>): string[] {
  return [...required].filter((k) => !(k in actual));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TaskContainer contract drift guard", () => {
  const BACKLOG_PATH =
    "docs/roadmap/BACKLOG-task-scoped-context-injection.md";

  it("parses 6 complete containers from the approved backlog source", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: unknown[];
    };
    const containers = snapshot.taskContainers ?? [];
    expect(containers).toHaveLength(6);

    const complete = containers.filter(
      (c): c is Record<string, unknown> =>
        typeof c === "object" && c !== null && (c as Record<string, unknown>)["complete"] === true,
    );
    expect(complete).toHaveLength(6);
  });

  it("parser emits no undeclared top-level keys on a complete container", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    expect(first).toBeDefined();

    const extra = unexpectedKeys(first!, EXPECTED_TOP_LEVEL_KEYS);
    expect(extra, `Parser emitted undeclared top-level keys: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("parser container includes all required contract keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    expect(first).toBeDefined();

    // Required keys: the non-optional fields + the loader flags always present
    const REQUIRED_KEYS = new Set<string>([
      "task_container_id",
      "task_id",
      "title",
      "complete",
      "missingFields",
    ]);

    const missing = missingKeys(first!, REQUIRED_KEYS);
    expect(missing, `Parser output missing required keys: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("symbol_links contains only declared keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    const symbolLinks = first?.["symbol_links"];
    if (symbolLinks == null || typeof symbolLinks !== "object") return;

    const extra = unexpectedKeys(symbolLinks as object, EXPECTED_SYMBOL_LINKS_KEYS);
    expect(extra, `symbol_links has undeclared keys: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("definition_of_done contains only declared keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    const dod = first?.["definition_of_done"];
    if (dod == null || typeof dod !== "object") return;

    const extra = unexpectedKeys(dod as object, EXPECTED_DEFINITION_OF_DONE_KEYS);
    expect(extra, `definition_of_done has undeclared keys: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("token_telemetry contains only declared keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    const telemetry = first?.["token_telemetry"];
    if (telemetry == null || typeof telemetry !== "object") return;

    const extra = unexpectedKeys(telemetry as object, EXPECTED_TOKEN_TELEMETRY_KEYS);
    expect(extra, `token_telemetry has undeclared keys: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("export contains only declared keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    const exportField = first?.["export"];
    if (exportField == null || typeof exportField !== "object") return;

    const extra = unexpectedKeys(exportField as object, EXPECTED_EXPORT_KEYS);
    expect(extra, `export has undeclared keys: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("ui_state contains only declared keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const first = snapshot.taskContainers?.[0];
    const uiState = first?.["ui_state"];
    if (uiState == null || typeof uiState !== "object") return;

    const extra = unexpectedKeys(uiState as object, EXPECTED_UI_STATE_KEYS);
    expect(extra, `ui_state has undeclared keys: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("all 6 containers have no undeclared top-level keys", async () => {
    const snapshot = await parseRoadmapSource(BACKLOG_PATH) as {
      taskContainers?: Record<string, unknown>[];
    };
    const containers = snapshot.taskContainers ?? [];

    for (const container of containers) {
      const id = String(container["task_container_id"] ?? "(unknown)");
      const extra = unexpectedKeys(container, EXPECTED_TOP_LEVEL_KEYS);
      expect(
        extra,
        `Container ${id} has undeclared top-level keys: ${extra.join(", ")}`,
      ).toHaveLength(0);
    }
  });
});

// =============================================================================
// TASK-PRD-019 (AUD-16): cross-runtime MissionSnapshot parity contract test.
//
// Same two-sided pattern as the TaskContainer guard above, applied to the top-level
// `MissionSnapshot` type (src/mission/domain.ts) vs. the runtime snapshot producer
// (`createRuntimeSnapshot` in scripts/mcp/runtime/snapshot-store.mjs).
//
// Compile-time link: `_missionSnapshotKeyCheck` is a direct `Record<keyof MissionSnapshot,
// true>` object-literal annotation (not `satisfies`), so TypeScript's excess-property
// checking catches BOTH directions of drift at type-check time (`npm run lint`): a field
// added to `MissionSnapshot` without adding it here fails to compile (missing key), and a
// stale key left here after a field is removed from `MissionSnapshot` also fails to compile
// (excess key on a literal assigned to an exact-shape annotation).
//
// Runtime link: `createRuntimeSnapshot()` is called for real and its own key set is compared
// against the (compile-checked) `MissionSnapshot` key set. `createRuntimeSnapshot()` returns
// only the server's BOOT-TIME initial snapshot object; several optional MissionSnapshot fields
// are populated later by other runtime code paths issuing `snapshotStore.patch({...})` calls
// (RoadmapService, GovibeRuntime's usage ingest) rather than appearing in the initial object.
// Those are recorded, justified, and self-asserted in RUNTIME_POST_BOOT_ALLOWLIST below rather
// than silently ignored — an allowlisted field that stops matching its recorded direction of
// drift (either MissionSnapshot drops it, or createRuntimeSnapshot() starts returning it) fails
// the "allowlist stays accurate" test and forces this file to be updated.
//
// Known-drift disposition (2026-08-19 audit, AUD-16):
//   - 7 producer-less slices (metrics, chart, reactor, graph, specs, symbols, campaignLogs):
//     structurally present as keys on BOTH sides already (createRuntimeSnapshot() seeds them),
//     so they do not fail a key-set comparison and are NOT in the allowlist below. Their gap is
//     that no runtime code path ever fills them with non-empty data — a data-population concern
//     the audit itself scopes to TASK-PRD-007, not a structural key-parity violation this
//     mechanism can express. Recorded and asserted in the second describe block below so the
//     drift stays visible without this task fabricating TASK-PRD-007's producers.
//   - heatmap: allowlisted below (orphan field pending TASK-PRD-006).
//   - roadmap, masterPlanPreview, roadmapSources, usage: allowlisted below (populated post-boot
//     by other runtime code paths, not part of createRuntimeSnapshot()'s initial shape).
//   - roadmap.dag rider: a NESTED field (RoadmapSnapshot.dag), not a top-level MissionSnapshot
//     field, so it is out of this mechanism's scope by construction. Recorded and pinned by a
//     source-level assertion in the third describe block below.
// =============================================================================

// ---------------------------------------------------------------------------
// Compile-time key registry — MUST stay in sync with `MissionSnapshot` in mission/domain.ts.
// Adding, removing, or renaming a field in `MissionSnapshot` makes this object fail to
// type-check (see the comment block above for why this catches both directions).
// ---------------------------------------------------------------------------
const _missionSnapshotKeyCheck: Record<keyof MissionSnapshot, true> = {
  connectionState: true,
  updatedAt: true,
  metrics: true,
  chart: true,
  reactor: true,
  agents: true,
  capabilities: true,
  terminal: true,
  graph: true,
  specs: true,
  symbols: true,
  heatmap: true,
  campaignLogs: true,
  roadmap: true,
  masterPlanPreview: true,
  roadmapSources: true,
  orchestration: true,
  workflowRuns: true,
  providers: true,
  memory: true,
  usage: true,
  sessions: true,
  auditLog: true,
  lastIngest: true,
};
// Suppress "unused variable" lint error — the object is only meaningful at type-check time.
void _missionSnapshotKeyCheck;

/** Every top-level key declared in `MissionSnapshot`, mirrored at the value level for runtime checks. */
const MISSION_SNAPSHOT_TYPE_KEYS = new Set<string>(Object.keys(_missionSnapshotKeyCheck));

/**
 * MissionSnapshot fields absent from createRuntimeSnapshot()'s boot-time key set, each with a
 * one-line justification citing the owning code path or product decision. See the block comment
 * above for the full disposition.
 */
const RUNTIME_POST_BOOT_ALLOWLIST: Record<string, string> = {
  heatmap:
    "No runtime producer at any point (frontend-only field). Orphan-or-retire decision owned by TASK-PRD-006.",
  roadmap:
    "Populated post-boot by RoadmapService.reloadRoadmap()'s snapshotStore.patch({roadmap}) (scripts/mcp/runtime/roadmap-service.mjs:519), not part of createRuntimeSnapshot()'s boot-time shape.",
  masterPlanPreview:
    "Populated on-demand by RoadmapService.previewMasterPlan() (scripts/mcp/runtime/roadmap-service.mjs:354-356); also tracked as an orphan field by TASK-PRD-006 from the 2026-08-06 audit.",
  roadmapSources:
    "Populated post-boot by RoadmapService.discoverSources()/reloadRoadmap() (scripts/mcp/runtime/roadmap-service.mjs:241,331), not part of createRuntimeSnapshot()'s boot-time shape.",
  usage:
    "Populated post-boot by GovibeRuntime.ingestUsageData() via snapshotStore.patch({usage}) (scripts/mcp/runtime-core.mjs:344), not part of createRuntimeSnapshot()'s boot-time shape.",
  lastIngest:
    "TASK-PRD-021 (AUD-24): a client-only provenance marker stamped by ReliableMissionGateway.handleEvent() (src/mission/gateway.ts) on every event it applies, distinguishing sidecar-delivered state from C3 debug-ingress / postMessage / dev-CustomEvent ingestion. The runtime never produces or transmits this field -- it exists only in the browser gateway's own snapshot store, by design.",
};

describe("MissionSnapshot cross-runtime parity guard (TASK-PRD-019)", () => {
  const runtimeBootKeys = new Set<string>(Object.keys(createRuntimeSnapshot()));

  it("every MissionSnapshot field exists in the runtime boot shape or an explicitly justified allowlist entry", () => {
    const missing = [...MISSION_SNAPSHOT_TYPE_KEYS].filter(
      (key) => !runtimeBootKeys.has(key) && !(key in RUNTIME_POST_BOOT_ALLOWLIST),
    );
    expect(
      missing,
      `MissionSnapshot fields absent from both createRuntimeSnapshot()'s boot shape and RUNTIME_POST_BOOT_ALLOWLIST: ${missing.join(", ")}. Either the runtime needs to carry this field, or it needs an allowlist entry with a justification.`,
    ).toHaveLength(0);
  });

  it("the runtime boot shape carries no top-level field MissionSnapshot does not declare", () => {
    const extra = [...runtimeBootKeys].filter((key) => !MISSION_SNAPSHOT_TYPE_KEYS.has(key));
    expect(
      extra,
      `createRuntimeSnapshot() returns undeclared top-level fields: ${extra.join(", ")}. Add them to MissionSnapshot (mission/domain.ts) or stop returning them.`,
    ).toHaveLength(0);
  });

  it("RUNTIME_POST_BOOT_ALLOWLIST stays accurate: every entry is a real MissionSnapshot field genuinely absent from the runtime boot shape", () => {
    for (const key of Object.keys(RUNTIME_POST_BOOT_ALLOWLIST)) {
      expect(
        MISSION_SNAPSHOT_TYPE_KEYS.has(key),
        `Allowlisted field "${key}" is no longer declared on MissionSnapshot; remove its allowlist entry.`,
      ).toBe(true);
      expect(
        runtimeBootKeys.has(key),
        `Allowlisted field "${key}" now appears in createRuntimeSnapshot()'s boot shape; its drift is reconciled — remove the allowlist entry.`,
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Producer-less slices (TASK-PRD-007 scope, tracked here per TASK-PRD-019's DoD but NOT fixed —
// fabricating producers for these is explicitly out of this task's scope).
// ---------------------------------------------------------------------------
const PRODUCER_LESS_SLICE_EMPTY_SHAPES: Record<string, unknown> = {
  metrics: [],
  chart: { labels: [], series: [] },
  reactor: [],
  graph: { nodes: [], edges: [] },
  specs: [],
  symbols: [],
  campaignLogs: [],
};

describe("MissionSnapshot producer-less slices (TASK-PRD-007 scope, recorded not fixed here)", () => {
  it("each producer-less slice is a real MissionSnapshot field the runtime boot shape carries (key-present, data-empty)", () => {
    const runtimeBootKeys = new Set<string>(Object.keys(createRuntimeSnapshot()));
    for (const key of Object.keys(PRODUCER_LESS_SLICE_EMPTY_SHAPES)) {
      expect(MISSION_SNAPSHOT_TYPE_KEYS.has(key), `"${key}" is no longer declared on MissionSnapshot.`).toBe(true);
      expect(runtimeBootKeys.has(key), `"${key}" is no longer present in createRuntimeSnapshot()'s boot shape.`).toBe(true);
    }
  });

  it("each producer-less slice is still seeded with its documented always-empty boot shape", () => {
    const snapshot = createRuntimeSnapshot() as Record<string, unknown>;
    for (const [key, emptyShape] of Object.entries(PRODUCER_LESS_SLICE_EMPTY_SHAPES)) {
      expect(
        snapshot[key],
        `"${key}" no longer matches its documented always-empty boot shape — TASK-PRD-007 may have wired a producer; update PRODUCER_LESS_SLICE_EMPTY_SHAPES and this task's disposition comment.`,
      ).toEqual(emptyShape);
    }
  });
});

// ---------------------------------------------------------------------------
// roadmap.dag: an untyped nested rider on RoadmapSnapshot, not a top-level MissionSnapshot
// field, so it is out of scope for the key-set comparisons above by construction. Pinned here by
// reading the actual source line that attaches it, so a rename or removal is still caught.
// ---------------------------------------------------------------------------
describe("roadmap.dag nested rider (TASK-PRD-019's DoD note, out of top-level parity scope)", () => {
  it("roadmap-service.mjs still attaches `dag` to the roadmap object as an untyped rider", () => {
    expect(
      roadmapServiceSource,
      "roadmap-service.mjs no longer attaches `dag: buildDag(...)` to the roadmap object the way the 2026-08-19 audit recorded. If RoadmapSnapshot (mission/domain.ts) now declares `dag`, this test and its disposition comment are stale and should be removed instead.",
    ).toMatch(/dag:\s*buildDag\(/);
  });
});
