// contracts/refs: thin wrappers around domain/ids.mjs building the specific
// msp:*-namespaced refs this packet's eleven tools return (WP-13 Bounded
// Scope item 3). Every ref this runtime ever mints is msp:-prefixed; no
// function here can produce a gks:-namespaced value (ADR-023/ADR-027).
import { mintRef, stableId } from "../domain/ids.mjs";

// Deterministic per workspace_id: msp_vault_status may report a workspace's
// identity before msp_workspace_register has ever been called for it (WP-13
// Bounded Scope item 1's "provisioned on first reference"), so this must be
// derivable from workspace_id alone, not from a stored row.
export function workspaceRef(workspaceId) {
  return mintRef("workspace", stableId("workspace", workspaceId));
}

export function vaultRegistryRef(workspaceId) {
  return mintRef("vault-registry", stableId("vault-registry", workspaceId));
}

export function vaultRef(vaultId) {
  return mintRef("vault", vaultId);
}

export function vaultMountRef(mountId) {
  return mintRef("vault-mount", mountId);
}

export function contextRef(id) {
  return mintRef("context", id);
}

export function contextDiffRef(id) {
  return mintRef("context-diff", id);
}

export function contextAuditRef(id) {
  return mintRef("context-audit", id);
}

export function replayRef(id) {
  return mintRef("replay", id);
}

export function contextInjectionRef(id) {
  return mintRef("context-injection", id);
}

export function proofRef(id) {
  return mintRef("proof", id);
}

export function memoryPromotionRef(idempotencyKey) {
  return mintRef("memory-promotion", idempotencyKey);
}
