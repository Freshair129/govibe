import { describe, expect, it } from "vitest";
import { isMissionEvent } from "../../../packages/mission-protocol/index.js";
import { RoadmapService, scoreApprovedSources } from "./roadmap-service.mjs";
import { RuntimeSnapshotStore, createRuntimeSnapshot } from "./snapshot-store.mjs";
import { TemporalOverlayStore } from "./temporal-overlay-store.mjs";

describe("roadmap service", () => {
  it("loads roadmap state without starting HTTP, WebSocket, stdio, or executors", async () => {
    const root = process.cwd();
    const snapshotStore = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const events = [];
    snapshotStore.subscribe((event) => events.push(event));
    const service = new RoadmapService({
      snapshotStore,
      temporalOverlayStore: new TemporalOverlayStore(),
      allowedRoadmapReadRoots: [`${root}/docs/roadmap`],
      allowedRoadmapWriteRoots: [`${root}/docs/roadmap`],
    });
    const sources = await service.discoverSources();
    expect(sources.length).toBeGreaterThan(0);
    await expect(service.reloadRoadmap()).resolves.toMatchObject({ approvalStatus: "approved" });
    expect(snapshotStore.getSnapshot().orchestration).toMatchObject({ waves: expect.any(Array), updatedAt: expect.any(String) });
    const orchestrationEvent = events.find((event) => event.type === "orchestration.update");
    expect(orchestrationEvent).toEqual({ type: "orchestration.update", orchestration: snapshotStore.getSnapshot().orchestration });
    expect(isMissionEvent(orchestrationEvent)).toBe(true);
  });
});

// TASK-PRD-030 (AUD-06): node.update used to accept state:"done" unconditionally
// — no verification precondition. This is the regression guard for that former
// false-success path.
describe("roadmap service — node.update done requires a passing verification (TASK-PRD-030)", () => {
  async function buildService() {
    const root = process.cwd();
    const snapshotStore = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new RoadmapService({
      snapshotStore,
      temporalOverlayStore: new TemporalOverlayStore(),
      allowedRoadmapReadRoots: [`${root}/docs/roadmap`],
      allowedRoadmapWriteRoots: [`${root}/docs/roadmap`],
    });
    await service.reloadRoadmap();
    return { service, snapshotStore };
  }

  it("refuses state:done with no recorded verification and audits the refusal", async () => {
    const { service, snapshotStore } = await buildService();
    await expect(
      service.applyRoadmapMutation({
        actor: "test",
        nodeId: "REGRESSION-node-no-verification",
        mutationType: "node.update",
        payload: { state: "done" },
      }),
    ).rejects.toThrow(/without a recorded passing verification/i);

    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === "REGRESSION-node-no-verification");
    expect(node).toBeUndefined(); // the transition never applied

    const auditEntry = snapshotStore.getSnapshot().auditLog?.at(-1);
    expect(auditEntry?.action).toBe("node.update.refused");
    expect(auditEntry?.taskId).toBe("REGRESSION-node-no-verification");
    expect(auditEntry?.reason).toMatch(/without a recorded passing verification/i);
  });

  it("refuses state:done when the recorded verification did not pass", async () => {
    const { service } = await buildService();
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId: "REGRESSION-node-failed-verification",
      mutationType: "verification",
      payload: { qaStatus: "failed" },
    });
    await expect(
      service.applyRoadmapMutation({
        actor: "test",
        nodeId: "REGRESSION-node-failed-verification",
        mutationType: "node.update",
        payload: { state: "done" },
      }),
    ).rejects.toThrow(/without a recorded passing verification/i);
  });

  it("applies state:done once a passing verification is recorded for the same task", async () => {
    const { service, snapshotStore } = await buildService();
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId: "REGRESSION-node-passing-verification",
      mutationType: "verification",
      payload: { qaStatus: "passed" },
    });
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId: "REGRESSION-node-passing-verification",
      mutationType: "node.update",
      payload: { state: "done", progress: 100 },
    });
    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === "REGRESSION-node-passing-verification");
    expect(node?.state).toBe("done");
  });

  // Review-gate finding 030-A (demonstrated bypass): the guard used to evaluate
  // latestTemporalByKey with the caller-supplied asOfValidAt/asOfRecordedAt (public
  // govibe.roadmap.update tool inputs). A caller could record passed -> superseding
  // failed, then request the SAME node.update with an asOfRecordedAt that predates the
  // failing record, and get state:"done" applied at present time with no audit entry.
  it("refuses state:done for a passed-then-superseded-by-failed verification even when the caller backdates asOfRecordedAt to before the failure (030-A)", async () => {
    const { service, snapshotStore } = await buildService();
    const nodeId = "REGRESSION-node-asof-bypass";

    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: { qaStatus: "passed", recordedAt: "2026-01-01T00:00:00.000Z" },
    });
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: { qaStatus: "failed", recordedAt: "2026-06-01T00:00:00.000Z" },
    });

    // Present-time done is correctly refused: the active verification is the failure.
    await expect(
      service.applyRoadmapMutation({ actor: "test", nodeId, mutationType: "node.update", payload: { state: "done" } }),
    ).rejects.toThrow(/without a recorded passing verification/i);

    // The bypass: the SAME done request, but with asOfRecordedAt backdated to a point
    // between the passed and failed records — must still be refused, because the guard
    // evaluates present-time truth, not the caller's requested historical view.
    await expect(
      service.applyRoadmapMutation({
        actor: "test",
        nodeId,
        mutationType: "node.update",
        payload: { state: "done" },
        asOfRecordedAt: "2026-03-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(/without a recorded passing verification/i);

    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId);
    expect(node).toBeUndefined(); // never applied, under either request

    const refusals = (snapshotStore.getSnapshot().auditLog ?? []).filter((entry) => entry.taskId === nodeId && entry.action === "node.update.refused");
    expect(refusals).toHaveLength(2); // both refusals audited, including the backdated attempt
  });

  // Review-gate finding 030-B: a verification mutation used to build the record from
  // scratch, so Mission Canvas's "approve" action (workflow-node-action-service.mjs,
  // mutationType "verification", payload {auditStatus:"passed"} only) silently erased a
  // previously recorded qaStatus:"passed" — destroying QA evidence and then blocking the
  // ADR-029 approve -> done flow on the 030-A/030 guard.
  it("preserves a previously recorded qaStatus when a later verification mutation supplies only auditStatus, and done still transitions afterward (030-B)", async () => {
    const { service, snapshotStore } = await buildService();
    const nodeId = "REGRESSION-node-approve-preserves-qastatus";

    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: { qaStatus: "passed" },
    });

    // Simulates WorkflowNodeActionService's "approve" mutation shape exactly.
    const approveResult = await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: { auditStatus: "passed" },
    });

    const latestVerification = approveResult.roadmap?.verifications?.find((item) => item.taskId === nodeId);
    expect(latestVerification?.auditStatus).toBe("passed");
    expect(latestVerification?.qaStatus).toBe("passed"); // not erased by the approve mutation

    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "node.update",
      payload: { state: "done", progress: 100 },
    });
    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId);
    expect(node?.state).toBe("done");
  });
});

// TASK-PRD-032 (AUD-15): a node.update to state:"done" that explicitly declares a
// non-editorial changeType must carry impact evidence (verification.impactResult) with
// no unaddressed must_update items, or the transition is refused and audited — mirroring
// the TASK-PRD-030 verification-precondition refusal pattern.
describe("roadmap service — done requires impact evidence for semantic-class changes (TASK-PRD-032)", () => {
  async function buildService() {
    const root = process.cwd();
    const snapshotStore = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new RoadmapService({
      snapshotStore,
      temporalOverlayStore: new TemporalOverlayStore(),
      allowedRoadmapReadRoots: [`${root}/docs/roadmap`],
      allowedRoadmapWriteRoots: [`${root}/docs/roadmap`],
    });
    await service.reloadRoadmap();
    return { service, snapshotStore };
  }

  it("refuses a semantic-class done with no recorded impact evidence", async () => {
    const { service, snapshotStore } = await buildService();
    const nodeId = "REGRESSION-node-semantic-no-impact";
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: { qaStatus: "passed" },
    });

    await expect(
      service.applyRoadmapMutation({
        actor: "test",
        nodeId,
        mutationType: "node.update",
        payload: { state: "done", changeType: "semantic_change" },
      }),
    ).rejects.toThrow(/carries no recorded govibe\.workspace\.impact evidence/i);

    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId);
    expect(node).toBeUndefined();
    const auditEntry = snapshotStore.getSnapshot().auditLog?.at(-1);
    expect(auditEntry?.action).toBe("node.update.refused");
    expect(auditEntry?.taskId).toBe(nodeId);
  });

  it("refuses a semantic-class done whose impact evidence has an unaddressed must_update item, listing it", async () => {
    const { service, snapshotStore } = await buildService();
    const nodeId = "REGRESSION-node-semantic-unaddressed";
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: {
        qaStatus: "passed",
        impactResult: {
          changeId: "change_test",
          mustUpdate: ["docs/architecture/ARCH-Vault-and-Context-Model.md"],
          addressed: [],
        },
      },
    });

    await expect(
      service.applyRoadmapMutation({
        actor: "test",
        nodeId,
        mutationType: "node.update",
        payload: { state: "done", changeType: "authority_boundary_change" },
      }),
    ).rejects.toThrow(/unaddressed must_update impact item.*ARCH-Vault-and-Context-Model\.md/is);

    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId);
    expect(node).toBeUndefined();
  });

  it("applies a semantic-class done once impact evidence has an empty or fully-addressed must_update set", async () => {
    const { service, snapshotStore } = await buildService();
    const nodeId = "REGRESSION-node-semantic-addressed";
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: {
        qaStatus: "passed",
        impactResult: {
          changeId: "change_test",
          mustUpdate: ["docs/architecture/ARCH-Vault-and-Context-Model.md"],
          addressed: ["docs/architecture/ARCH-Vault-and-Context-Model.md"],
        },
      },
    });

    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "node.update",
      payload: { state: "done", progress: 100, changeType: "schema_breaking" },
    });

    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId);
    expect(node?.state).toBe("done");
  });

  it("does not gate an editorial-class (or unlabeled) done on impact evidence", async () => {
    const { service, snapshotStore } = await buildService();
    const nodeId = "REGRESSION-node-editorial-unblocked";
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "verification",
      payload: { qaStatus: "passed" },
    });

    await service.applyRoadmapMutation({
      actor: "test",
      nodeId,
      mutationType: "node.update",
      payload: { state: "done", progress: 100, changeType: "editorial" },
    });

    const node = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId);
    expect(node?.state).toBe("done");

    const nodeId2 = "REGRESSION-node-unlabeled-unblocked";
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId: nodeId2,
      mutationType: "verification",
      payload: { qaStatus: "passed" },
    });
    await service.applyRoadmapMutation({
      actor: "test",
      nodeId: nodeId2,
      mutationType: "node.update",
      payload: { state: "done", progress: 100 },
    });
    const node2 = snapshotStore.getSnapshot().roadmap?.nodes?.find((item) => item.id === nodeId2);
    expect(node2?.state).toBe("done");
  });
});

// TASK-PRD-012 (GAP-10): a source with no authored updatedAt must not receive a
// recency bonus. Only an authored timestamp is a real freshness signal.
describe("scoreApprovedSources — recency scoring (TASK-PRD-012)", () => {
  const baseItem = (overrides) => ({
    path: overrides.path,
    approvalStatus: "approved",
    planningType: "roadmap",
    actionableDepthLabel: "phase-only",
    actionableDepthBonus: 0,
    taskCount: 0,
    ...overrides,
  });

  it("gives no recency bonus to a source with an undefined updatedAt", () => {
    const undated = baseItem({ path: "undated.md", updatedAt: undefined });
    const older = baseItem({ path: "older.md", updatedAt: "2026-01-01T00:00:00Z" });
    const newer = baseItem({ path: "newer.md", updatedAt: "2026-08-01T00:00:00Z" });
    const [scoredUndated, scoredOlder, scoredNewer] = scoreApprovedSources([undated, older, newer], undefined);

    expect(scoredUndated.scoreBreakdown).not.toContain("recent");
    expect(scoredNewer.scoreBreakdown).toContain("recent");
    expect(scoredUndated.score).toBeLessThan(scoredNewer.score);
    expect(scoredUndated.score).toBeLessThanOrEqual(scoredOlder.score);
  });

  it("does not let an undated source outscore an authored-recent one of equal weight", () => {
    // Regression shape for GAP-10: before the fix, an unauthored source's
    // updatedAt fell back to parse time (effectively "now"), which reads as the
    // newest item in the set and wins the recency bonus outright over a
    // genuinely old-but-authored plan.
    const undated = baseItem({ path: "undated.md", updatedAt: undefined });
    const oldAuthored = baseItem({ path: "old.md", updatedAt: "2026-01-01T00:00:00Z" });
    const newAuthored = baseItem({ path: "new.md", updatedAt: "2026-08-01T00:00:00Z" });
    const [scoredUndated, , scoredNew] = scoreApprovedSources([undated, oldAuthored, newAuthored], undefined);

    expect(scoredUndated.scoreBreakdown).not.toContain("recent");
    expect(scoredUndated.score).toBeLessThan(scoredNew.score);
  });
});
