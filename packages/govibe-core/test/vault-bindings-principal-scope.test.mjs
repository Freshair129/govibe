import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createWorkspaceVaultBindings } from "../src/vaults.mjs";

function stableId(prefix, ...parts) {
  const digest = createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

describe("Issue #136 workspace vault bindings", () => {
  it("preserves v1 deterministic ids when tenant/principal dimensions are absent", () => {
    const workspacePath = path.resolve("/tmp/govibe-legacy-workspace");
    const result = createWorkspaceVaultBindings({
      projectName: "Legacy Project",
      workspacePath,
      agentId: "agent-a",
    });
    const projectId = stableId("project", "legacy-project");
    const workspaceId = stableId("workspace", projectId, workspacePath);

    expect(result.project_id).toBe(projectId);
    expect(result.workspace_id).toBe(workspaceId);
    expect(result.primary_shared_vault.vault_id).toBe(stableId("vault", "shared", projectId));
    expect(result.workspace_private_vaults[0].vault_id).toBe(stableId("vault", "private", "agent-a", workspaceId));
    expect(result.global_private_vault.vault_id).toBe(stableId("vault", "private", "global", "agent-a"));
  });

  it("isolates two principals using the same agent and workspace", () => {
    const common = {
      projectName: "SaaS Project",
      workspacePath: "/tmp/shared-workspace",
      agentId: "agent-a",
      tenantId: "tenant-a",
    };
    const alice = createWorkspaceVaultBindings({ ...common, principalId: "alice" });
    const bob = createWorkspaceVaultBindings({ ...common, principalId: "bob" });

    expect(alice.workspace_id).toBe(bob.workspace_id);
    expect(alice.workspace_private_vaults[0].vault_id).not.toBe(bob.workspace_private_vaults[0].vault_id);
    expect(alice.global_private_vault.vault_id).not.toBe(bob.global_private_vault.vault_id);
    expect(alice.primary_shared_vault.vault_id).toBe(bob.primary_shared_vault.vault_id);
  });

  it("supports tenant-agent Global Private without changing vault taxonomy", () => {
    const result = createWorkspaceVaultBindings({
      projectName: "SaaS Project",
      workspacePath: "/tmp/shared-workspace",
      agentId: "agent-a",
      tenantId: "tenant-a",
      principalId: "alice",
      globalPrivateScope: "tenant",
    });

    expect(result.global_private_vault.vault_type).toBe("private");
    expect(result.global_private_vault.vault_level).toBe("global");
    expect(result.global_private_vault.tenant_id).toBe("tenant-a");
    expect(result.global_private_vault.principal_id).toBeNull();
  });

  it("rejects principal-as-agent identity collapse", () => {
    expect(() => createWorkspaceVaultBindings({
      projectName: "SaaS Project",
      workspacePath: "/tmp/shared-workspace",
      agentId: "same-id",
      tenantId: "tenant-a",
      principalId: "same-id",
    })).toThrow(/principalId must not substitute for agentId/i);
  });
});
