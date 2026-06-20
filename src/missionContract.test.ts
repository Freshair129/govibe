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
import type { TaskContainer } from "./mission";
// @ts-expect-error — .mjs module, no TS declaration
import { parseRoadmapSource } from "../scripts/mcp/roadmap-parser.mjs";

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
