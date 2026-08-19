// TASK-PRD-029 (AUD-08): C-3 canvas actions and H4 session starts previously accepted ANY
// non-empty `approvalRef` string as proof of an owner sign-off — "ceremony, not verified
// authority" per the audit. This module is the recorded-approval side of the fix: an
// append-only store (mirrors scripts/mcp/runtime/rbac-enforcement.mjs's `.govibe/rbac-audit.jsonl`
// pattern) that a gate can verify a presented approvalRef against, rather than trusting the
// caller's word for it.
//
// Recording follows the same precedent `.govibe/rbac.json` role assignments already set in
// this codebase: there is no live MCP tool that grants an RBAC role either — the state file is
// owner-authored/bootstrapped directly. `recordApproval` is that same authoring primitive for
// approvals, callable from an owner-run script; the runtime-side gates below only ever verify.

import { appendFile, readFile } from "node:fs/promises";

export const APPROVAL_RECORD_SCHEMA = "govibe-approval-record/v1";

export class ApprovalVerificationError extends Error {
  constructor(approvalRef, reason) {
    super(`Approval reference "${approvalRef}" could not be verified: ${reason}`);
    this.name = "ApprovalVerificationError";
    this.code = "approval_unverifiable";
    this.approvalRef = approvalRef;
    this.reason = reason;
  }
}

async function readJsonlIfExists(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    const trimmed = text.trim();
    return trimmed.length === 0 ? [] : trimmed.split("\n").map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

// A recorded scope covers a requested scope when every key the caller asked about matches.
// The recorded scope MAY carry additional keys (e.g. a free-text `notes`-adjacent field) the
// caller doesn't check — this is a subset match, not an exact-object match.
function scopeCovers(recordedScope, requiredScope) {
  if (!recordedScope || typeof recordedScope !== "object") return false;
  return Object.entries(requiredScope).every(([key, value]) => recordedScope[key] === value);
}

export function createApprovalRecordStore({ storePath, now = () => new Date().toISOString() }) {
  if (!storePath) throw new Error("createApprovalRecordStore requires storePath.");

  async function recordApproval({ approvalRef, approver, scope, notes } = {}) {
    if (typeof approvalRef !== "string" || !approvalRef.trim()) throw new Error("recordApproval requires a non-empty approvalRef.");
    if (typeof approver !== "string" || !approver.trim()) throw new Error("recordApproval requires a non-empty approver principal.");
    if (!scope || typeof scope !== "object" || Array.isArray(scope)) throw new Error("recordApproval requires a scope object.");

    const record = Object.freeze({
      schema: APPROVAL_RECORD_SCHEMA,
      approvalRef: approvalRef.trim(),
      approver: approver.trim(),
      scope,
      notes: notes ?? null,
      recordedAt: now(),
    });
    await appendFile(storePath, `${JSON.stringify(record)}\n`, "utf8");
    return record;
  }

  // Verifies a presented approvalRef against the store: it must exist, and at least one
  // recorded entry for that ref must cover `requiredScope`. Throws ApprovalVerificationError
  // (fail closed) rather than returning a falsy value, so a caller cannot forget to check a
  // boolean and fall through into the gated action anyway.
  async function verifyApproval({ approvalRef, requiredScope = {} }) {
    if (typeof approvalRef !== "string" || !approvalRef.trim()) {
      throw new ApprovalVerificationError(String(approvalRef ?? ""), "missing_approval_ref");
    }
    const records = await readJsonlIfExists(storePath);
    const matchingRef = records.filter((record) => record.approvalRef === approvalRef);
    if (matchingRef.length === 0) throw new ApprovalVerificationError(approvalRef, "not_recorded");

    const covering = matchingRef.find((record) => scopeCovers(record.scope, requiredScope));
    if (!covering) throw new ApprovalVerificationError(approvalRef, "scope_mismatch");
    return covering;
  }

  async function listApprovals() {
    return readJsonlIfExists(storePath);
  }

  return Object.freeze({ recordApproval, verifyApproval, listApprovals });
}
