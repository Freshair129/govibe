import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  bindRuntimeKv,
  buildContextPacket,
  createContextLineage,
  createWorkspaceVaultBindings,
  loadContextCache,
  persistContextInjection,
  validateContextProfile,
} from "../packages/govibe-core/src/index.mjs";

const temporary = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("vault identity", () => {
  it("creates stable project workspace and vault identities", () => {
    const input = { projectName: "GoVibe", workspacePath: "/tmp/govibe", agentId: "architect" };
    const first = createWorkspaceVaultBindings(input);
    const second = createWorkspaceVaultBindings(input);
    expect(first).toEqual(second);
    expect(first.primary_shared_vault.materialization_path).toBe(".brain/govibe");
    expect(first.workspace_private_vaults[0].materialization_path).toBe(".brain/private/architect");
    expect(first.global_private_vault.vault_level).toBe("global");
  });

  it("rejects unsafe agent identifiers", () => {
    expect(() => createWorkspaceVaultBindings({ projectName: "GoVibe", workspacePath: "/tmp/govibe", agentId: "../escape" })).toThrow(/safe stable identifier/);
  });
});

describe("context lineage", () => {
  it("supports the four canonical profiles and runtime KV binding", () => {
    for (const profile of ["T-ctx", "V-ctx", "W-ctx", "M-ctx"]) expect(validateContextProfile(profile)).toBe(profile);
    const lineage = createContextLineage({ profile: "M-ctx", sources: { workspace: [{ ref: "msp:vault/1", version: 2 }] }, parentContextId: "ctx_parent" });
    expect(lineage.contextId).toMatch(/^ctx_/);
    expect(lineage.cacheId).toMatch(/^cache_/);
    expect(lineage.parentContextId).toBe("ctx_parent");
    expect(bindRuntimeKv(lineage, "kv_runtime_1").kvId).toBe("kv_runtime_1");
  });

  it("builds and persists the exact injected packet", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-context-"));
    temporary.push(root);
    const packet = buildContextPacket({
      projectState: {
        projectId: "project_1",
        workspaceId: "workspace_1",
        objective: "Audit one task",
        moduleScope: "workspace",
        constraints: [],
        sourceRefs: [{ path: "README.md", kind: "other", required: true }],
        fileRefs: [],
        verificationExpectations: [],
        criticalKnownIssues: [],
      },
      skill: { id: "scan", version: "1.0.0", contentHash: "a".repeat(64) },
      context: {
        globalPrivateVaultRefs: [{ ref: "msp:vault/global", sourceHash: "b".repeat(64), version: 1 }],
        workspacePrivateVaultRefs: [{ ref: "msp:vault/workspace", sourceHash: "c".repeat(64), version: 4 }],
        sharedVaultRefs: [{ ref: "gks:shared/1", sourceHash: "d".repeat(64), version: 8 }],
        policyDecisions: [],
      },
      contextProfile: "V-ctx",
    });
    const persisted = await persistContextInjection({ workspacePath: root, packet, agentId: "architect", runId: "run-1", turnId: "turn-1" });
    const cached = await loadContextCache({ workspacePath: root, cacheId: packet.cacheId });
    expect(cached.packet.contextId).toBe(packet.contextId);
    expect(persisted.record.context_profile).toBe("V-ctx");
    expect(persisted.record.packet_hash).toHaveLength(64);
  });
});
