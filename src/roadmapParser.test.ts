/**
 * Unit tests for scripts/mcp/roadmap-parser.mjs
 *
 * Fixture: src/__fixtures__/BACKLOG-parser-fixture.md
 *
 * Vitest collects src/**\/*.test.ts — this file lives under src/ so it is
 * picked up without any config changes.
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs module, no TS declaration
import { parseRoadmapSource } from "../scripts/mcp/roadmap-parser.mjs";

// Bare cwd-relative path (vitest runs from the project root; the parser reads it
// with node:fs internally). Avoids importing node:path / process so this stays
// lint-clean under tsc without @types/node.
const fixturePath = "src/__fixtures__/BACKLOG-parser-fixture.md";

describe("parseRoadmapSource — BACKLOG-parser-fixture.md", () => {
  // Shared snapshot — parsed once across all tests to keep the suite fast.
  let snapshot: Awaited<ReturnType<typeof parseRoadmapSource>>;

  it("parses the fixture without throwing", async () => {
    snapshot = await parseRoadmapSource(fixturePath);
    expect(snapshot).toBeDefined();
  });

  // ─── Basic shape ────────────────────────────────────────────────────────────

  it("returns the expected top-level snapshot shape", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);
    expect(snapshot.sourceType).toBe("markdown");
    expect(snapshot.planningType).toBe("backlog");
    expect(snapshot.approvalStatus).toBe("approved");
    expect(Array.isArray(snapshot.nodes)).toBe(true);
    expect(Array.isArray(snapshot.taskContainers)).toBe(true);
  });

  // ─── Task nodes ─────────────────────────────────────────────────────────────

  it("includes TASK-FIX-01 and TASK-FIX-02 as task-type backlog nodes", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);

    const ids = snapshot.nodes.map((n: { id: string }) => n.id);
    expect(ids).toContain("TASK-FIX-01");
    expect(ids).toContain("TASK-FIX-02");

    const task01 = snapshot.nodes.find((n: { id: string }) => n.id === "TASK-FIX-01");
    const task02 = snapshot.nodes.find((n: { id: string }) => n.id === "TASK-FIX-02");

    expect(task01?.type).toBe("task");
    expect(task02?.type).toBe("task");
  });

  // ─── Checklist breakdown nodes ───────────────────────────────────────────────

  it("includes S-FIX-01.1 and M-FIX-01.1 breakdown nodes from Task Breakdown", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);

    const ids = snapshot.nodes.map((n: { id: string }) => n.id);
    expect(ids).toContain("S-FIX-01.1");
    expect(ids).toContain("M-FIX-01.1");

    const sFix = snapshot.nodes.find((n: { id: string }) => n.id === "S-FIX-01.1");
    expect(sFix?.state).toBe("done"); // - [x] = checked = done
    const mFix = snapshot.nodes.find((n: { id: string }) => n.id === "M-FIX-01.1");
    expect(mFix?.state).toBe("planned"); // - [ ] = unchecked = planned
  });

  // ─── Junk exclusion ─────────────────────────────────────────────────────────

  it("does NOT produce task nodes for prose Acceptance Criteria bullets", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);

    const nodeIds = snapshot.nodes.map((n: { id: string }) => n.id);

    // The prose bullets start with words like "The", "Local", "Parser"
    // and MUST NOT appear as node IDs.
    const junkIds = ["The", "Local", "Parser"];
    for (const junk of junkIds) {
      expect(nodeIds).not.toContain(junk);
    }

    // Double-check: no node id contains a space (real ids are alphanumeric+dash+dot)
    const nodesWithSpaces = nodeIds.filter((id: string) => id.includes(" "));
    expect(nodesWithSpaces).toHaveLength(0);
  });

  // ─── Task containers count ──────────────────────────────────────────────────

  it("returns exactly two task containers", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);
    expect(snapshot.taskContainers).toHaveLength(2);
  });

  // ─── Complete container (TASK-FIX-01) ───────────────────────────────────────

  it("marks the TASK-FIX-01 container as complete with all required fields", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);

    const container = snapshot.taskContainers.find(
      (c: { task_id: string }) => c.task_id === "TASK-FIX-01",
    );
    expect(container).toBeDefined();
    expect(container.complete).toBe(true);
    expect(container.missingFields).toHaveLength(0);

    // Scalar fields
    expect(container.complexity).toBe("medium");
    expect(container.requirement_type).toBe("FR");

    // Symbol links
    expect(container.symbol_links?.code).toBeTruthy();
    expect(container.symbol_links?.doc).toBeTruthy();
    expect(container.symbol_links?.test).toBeTruthy();

    // Token telemetry
    expect(container.token_telemetry?.total_token_usage).toBeTruthy();

    // Definition of done — acceptance_criteria first item
    const ac = container.definition_of_done?.acceptance_criteria;
    expect(Array.isArray(ac)).toBe(true);
    expect(ac.length).toBeGreaterThan(0);
    expect(ac[0].criterion).toBe("Packet shell fields are all present");
  });

  // ─── Incomplete container (TASK-FIX-02) ─────────────────────────────────────

  it("marks the TASK-FIX-02 container as incomplete and reports missing fields", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);

    const container = snapshot.taskContainers.find(
      (c: { task_id: string }) => c.task_id === "TASK-FIX-02",
    );
    expect(container).toBeDefined();
    expect(container.complete).toBe(false);
    expect(container.missingFields.length).toBeGreaterThan(0);

    // complexity was deliberately omitted
    expect(container.missingFields).toContain("complexity");

    // exit_criteria was deliberately omitted
    expect(container.missingFields).toContain("definition_of_done.exit_criteria");
  });

  // ─── Path integrity ──────────────────────────────────────────────────────────

  it("sets sourcePath to the absolute fixture path", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);
    // Normalize separators for cross-platform comparison
    const normalizedSource = snapshot.sourcePath.replace(/\\/g, "/");
    const normalizedFixture = fixturePath.replace(/\\/g, "/");
    expect(normalizedSource).toBe(normalizedFixture);
  });

  // ─── Phase / Sprint / Backlog hierarchy ─────────────────────────────────────

  it("includes a phase node and a sprint node from the tables", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);

    const phase = snapshot.nodes.find((n: { id: string }) => n.id === "PHA-FIX-01");
    const sprint = snapshot.nodes.find((n: { id: string }) => n.id === "SPR-FIX-01A");

    expect(phase).toBeDefined();
    expect(phase?.type).toBe("phase");

    expect(sprint).toBeDefined();
    expect(sprint?.type).toBe("sprint");
    expect(sprint?.parentId).toBe("PHA-FIX-01");
  });

  // ─── updatedAt authoring (TASK-PRD-012 / GAP-10) ────────────────────────────

  it("reports the authored `updated` frontmatter value as updatedAt", async () => {
    if (!snapshot) snapshot = await parseRoadmapSource(fixturePath);
    expect(snapshot.updatedAt).toBe("2026-06-20");
  });
});

describe("parseRoadmapSource — BACKLOG-parser-fixture-no-updated.md", () => {
  const noUpdatedFixturePath = "src/__fixtures__/BACKLOG-parser-fixture-no-updated.md";

  it("leaves updatedAt undefined instead of falling back to parse time", async () => {
    const snapshot = await parseRoadmapSource(noUpdatedFixturePath);
    // Must NOT be a parse-time stand-in (e.g. "just now") — an unauthored source
    // has no freshness signal at all, so downstream scoring must not treat it
    // as recent (GAP-10 / TASK-PRD-012).
    expect(snapshot.updatedAt).toBeUndefined();
  });
});
