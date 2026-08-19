// TASK-PRD-029 (AUD-08) core coverage.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ApprovalVerificationError, createApprovalRecordStore } from "./approval-record.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function storeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-approval-record-"));
  roots.push(root);
  return createApprovalRecordStore({ storePath: path.join(root, "approvals.jsonl"), now: () => "2026-08-19T00:00:00.000Z" });
}

describe("createApprovalRecordStore", () => {
  it("refuses an approvalRef that was never recorded", async () => {
    const store = await storeFixture();
    await expect(store.verifyApproval({ approvalRef: "ghost-ref", requiredScope: { taskId: "T1" } }))
      .rejects.toThrow(ApprovalVerificationError);
    await expect(store.verifyApproval({ approvalRef: "ghost-ref", requiredScope: { taskId: "T1" } }))
      .rejects.toMatchObject({ code: "approval_unverifiable", reason: "not_recorded" });
  });

  it("refuses an empty or missing approvalRef outright", async () => {
    const store = await storeFixture();
    await expect(store.verifyApproval({ approvalRef: "", requiredScope: {} })).rejects.toMatchObject({ reason: "missing_approval_ref" });
    await expect(store.verifyApproval({ approvalRef: undefined, requiredScope: {} })).rejects.toMatchObject({ reason: "missing_approval_ref" });
  });

  it("refuses a recorded approval whose scope does not cover the request", async () => {
    const store = await storeFixture();
    await store.recordApproval({ approvalRef: "owner-signoff-1", approver: "employee_boss-01", scope: { taskId: "T1", complexity: "C-3" } });
    await expect(store.verifyApproval({ approvalRef: "owner-signoff-1", requiredScope: { taskId: "T2", complexity: "C-3" } }))
      .rejects.toMatchObject({ reason: "scope_mismatch" });
  });

  it("accepts a recorded approval whose scope covers the request and returns the record", async () => {
    const store = await storeFixture();
    await store.recordApproval({ approvalRef: "owner-signoff-1", approver: "employee_boss-01", scope: { taskId: "T1", complexity: "C-3" } });
    const record = await store.verifyApproval({ approvalRef: "owner-signoff-1", requiredScope: { taskId: "T1", complexity: "C-3" } });
    expect(record).toMatchObject({ approvalRef: "owner-signoff-1", approver: "employee_boss-01" });
  });

  it("lets a broader recorded scope cover a narrower request (subset match)", async () => {
    const store = await storeFixture();
    await store.recordApproval({ approvalRef: "broad-1", approver: "employee_boss-01", scope: { taskId: "T1", complexity: "C-3", extra: "anything" } });
    await expect(store.verifyApproval({ approvalRef: "broad-1", requiredScope: { taskId: "T1" } })).resolves.toMatchObject({ approvalRef: "broad-1" });
  });

  it("rejects recording without an approver principal or scope, and never records an empty ref", async () => {
    const store = await storeFixture();
    await expect(store.recordApproval({ approvalRef: "x", scope: { taskId: "T1" } })).rejects.toThrow(/approver/);
    await expect(store.recordApproval({ approvalRef: "x", approver: "employee_boss-01" })).rejects.toThrow(/scope/);
    await expect(store.recordApproval({ approvalRef: "  ", approver: "employee_boss-01", scope: { taskId: "T1" } })).rejects.toThrow(/approvalRef/);
  });

  it("is append-only and durable across store instances pointed at the same file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-approval-record-durable-"));
    roots.push(root);
    const storePath = path.join(root, "approvals.jsonl");
    const first = createApprovalRecordStore({ storePath });
    await first.recordApproval({ approvalRef: "durable-1", approver: "employee_boss-01", scope: { taskId: "T1" } });

    const second = createApprovalRecordStore({ storePath });
    await expect(second.verifyApproval({ approvalRef: "durable-1", requiredScope: { taskId: "T1" } })).resolves.toBeTruthy();
    expect(await second.listApprovals()).toHaveLength(1);
  });
});
