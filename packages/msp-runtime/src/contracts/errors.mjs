// contracts/errors: typed error classes for the contracts/ layer. Per
// WP-13's dependency-boundary rule (Bounded Scope item 7), contracts/ may
// import domain/ids.mjs and domain/errors.mjs ONLY -- never
// domain/entity-store.mjs or domain/vault-registry.mjs directly. This file
// re-exports domain/errors.mjs's existing vocabulary unchanged and adds the
// error shapes this packet's contract-shaping/validation logic needs that
// WP-12 had no occasion to define yet.
export { MemoryConflictError, MemoryNotFoundError, MspRuntimeError, SchemaVersionError } from "../domain/errors.mjs";

import { MspRuntimeError } from "../domain/errors.mjs";

/** A request failed contracts/'s own shape validation before reaching domain/. */
export class ValidationError extends MspRuntimeError {
  constructor(message, code = "invalid_request") {
    super(message, code);
  }
}

/**
 * A candidate or ref tried to assign or reference gks:-namespaced canonical
 * identity. Raised by contracts/namespace-guard.mjs's rejectCanonicalCandidate
 * / requireNoGksRefs -- defense in depth, independent of the GoVibe-side
 * rejectCanonicalCandidate guard in scripts/mcp/msp-vault-context-contracts.mjs
 * (WP-13 AC-06).
 */
export class NamespaceViolationError extends MspRuntimeError {
  constructor(message = "Candidate must not assign or reference a canonical GKS identity.") {
    super(message, "provider_canonical_identity_forbidden");
  }
}

/**
 * Fail-closed stub reason for msp_knowledge_promote and
 * msp_memory_promote(target_scope=shared): no GKS provider exists in v1
 * (ADR-027). Never caught and converted into a fabricated success envelope
 * anywhere in this packet (WP-13 AC-03).
 */
export class GksProviderUnconfiguredError extends MspRuntimeError {
  constructor(message = "No GKS provider is configured; shared-scope promotion is fail-closed.") {
    super(message, "gks_provider_unconfigured");
  }
}
