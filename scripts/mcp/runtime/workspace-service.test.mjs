import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeSnapshotStore, createRuntimeSnapshot } from "./snapshot-store.mjs";
import { WorkspaceService } from "./workspace-service.mjs";

function contextAuthority() {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "TASK-workspace", agentId: "workspace-agent", workspaceId: "workspace-service", runId: "run-workspace", sessionId: "session-workspace", turnId: "turn-workspace" },
    sources: [{ id: "API-007", version: "0.1.0", hash: "a".repeat(64) }],
    requiredReasonRefs: ["issue:workspace"],
    traversal: { relationAllowlist: ["implements"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    knowledgeRefs: [], budget: { maxTokens: 1024, compaction: "bounded" },
    lineage: { contextId: "ctx-workspace", cacheId: "cache-workspace", parentContextId: null }, unresolvedAssumptions: [],
  };
}

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
describe("workspace service", () => {
  it("can be instantiated and validates roots without transports or executors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.target(root)).resolves.toBe(root);
    await expect(service.target(path.parse(root).root)).rejects.toThrow("outside configured GoVibe roots");
  });

  it("fails closed before loading workspace continuation dependencies without caller authority", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.continue({ workspacePath: root })).rejects.toMatchObject({ code: "missing_runtime_authority" });
  });

  it("rejects a caller agent that differs from the supplied authority before loading dependencies", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.continue({ workspacePath: root, agentId: "other-agent", contextAuthority: contextAuthority() })).rejects.toMatchObject({ code: "authority_identity_mismatch" });
  });
});
