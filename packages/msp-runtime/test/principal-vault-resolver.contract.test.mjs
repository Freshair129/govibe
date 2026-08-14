import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../src/server.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function serverFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "msp-vault-resolve-contract-"));
  const dbPath = path.join(dir, "msp.sqlite3");
  const server = createServer({ dbPath });
  cleanups.push(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return server;
}

describe("Issue #136 msp_vault_resolve contract", () => {
  it("is registered and returns the authorized vault set", async () => {
    const { toolRegistry } = serverFixture();
    expect(toolRegistry.has("msp_vault_resolve")).toBe(true);

    const envelope = await toolRegistry.dispatch("msp_vault_resolve", {
      actor: "integration-test",
      access_context: {
        tenant_id: "tenant-a",
        business_id: "business-a",
        principal_id: "principal-a",
        agent_id: "agent-a",
        project_id: "project-a",
        workspace_id: "workspace-a",
        thread_id: "thread-a",
        session_id: "session-a",
        instance_id: "instance-a",
      },
      authorization: {
        membership_active: true,
        allow_global_private: true,
        allow_shared: true,
      },
    });

    const result = envelope.structuredContent;
    expect(result.workspacePrivateVaultId).toMatch(/^vault_/);
    expect(result.globalPrivateVaultIds).toHaveLength(2);
    expect(result.sharedVaultIds).toHaveLength(1);
    expect(result.permissions).toMatchObject({ read: true, writePrivate: true, writeShared: false });
  });

  it("reflects revoked membership on the next call", async () => {
    const { toolRegistry } = serverFixture();
    const request = {
      actor: "integration-test",
      access_context: {
        tenant_id: "tenant-a",
        principal_id: "principal-a",
        agent_id: "agent-a",
        project_id: "project-a",
        workspace_id: "workspace-a",
      },
    };

    await expect(toolRegistry.dispatch("msp_vault_resolve", {
      ...request,
      authorization: { membership_active: true },
    })).resolves.toBeTruthy();

    await expect(toolRegistry.dispatch("msp_vault_resolve", {
      ...request,
      authorization: { membership_active: false },
    })).rejects.toMatchObject({ code: "vault_scope_denied" });
  });
});
