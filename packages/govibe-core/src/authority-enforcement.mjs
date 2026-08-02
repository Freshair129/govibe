const HASH = /^(?:sha256:)?[a-f0-9]{64}$/i;

export class RuntimeAuthorityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RuntimeAuthorityError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new RuntimeAuthorityError(code, message, details);
}

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("missing_runtime_authority", `${field} is required.`, { field });
  return value;
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) fail("invalid_runtime_authority", `${field} is required.`, { field });
  return value.trim();
}

function requireStringArray(value, field, { min = 0 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail("invalid_runtime_authority", `${field} must contain at least ${min} non-empty string value(s).`, { field, min });
  }
  return value.map((item) => item.trim());
}

export function buildBoundedGraphQuery(contextAuthority) {
  const authority = requireObject(contextAuthority, "contextAuthority");
  if (authority.schemaVersion !== "govibe-context-authority/v1") {
    fail("invalid_runtime_authority", "Unsupported context authority schema.", { schemaVersion: authority.schemaVersion });
  }

  const traversal = requireObject(authority.traversal, "contextAuthority.traversal");
  const relationAllowlist = requireStringArray(traversal.relationAllowlist, "contextAuthority.traversal.relationAllowlist", { min: 1 });
  if (relationAllowlist.includes("*") || relationAllowlist.includes("unrestricted")) {
    fail("unrestricted_traversal", "Unrestricted graph traversal is prohibited.", { relationAllowlist });
  }

  const radius = Number(traversal.retrievalRadius);
  if (!Number.isInteger(radius) || radius < 0 || radius > 6) {
    fail("invalid_retrieval_radius", "Graph retrieval radius must be an integer from 0 to 6.", { radius: traversal.retrievalRadius });
  }

  const sources = Array.isArray(authority.sources) ? authority.sources : [];
  if (sources.length === 0) fail("missing_source_lineage", "At least one source is required for graph retrieval.");
  const sourceConstraints = sources.map((source, index) => {
    const id = requireString(source?.id, `contextAuthority.sources[${index}].id`);
    const version = requireString(source?.version, `contextAuthority.sources[${index}].version`);
    const hash = requireString(source?.hash, `contextAuthority.sources[${index}].hash`);
    if (!HASH.test(hash)) fail("invalid_source_hash", "Graph source hash must be SHA-256.", { index, hash });
    return { id, version, hash: hash.toLowerCase() };
  });

  const budget = requireObject(authority.budget, "contextAuthority.budget");
  const maxTokens = Number(budget.maxTokens);
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) fail("invalid_budget", "Graph query budget must be positive.", { maxTokens: budget.maxTokens });

  return {
    schema_version: "govibe-bounded-graph-query/v1",
    seeds: requireStringArray(authority.knowledgeRefs ?? [], "contextAuthority.knowledgeRefs"),
    required_reason_refs: requireStringArray(authority.requiredReasonRefs, "contextAuthority.requiredReasonRefs", { min: 1 }),
    relation_allowlist: relationAllowlist,
    radius,
    inclusions: requireStringArray(traversal.inclusions ?? [], "contextAuthority.traversal.inclusions"),
    exclusions: requireStringArray(traversal.exclusions ?? [], "contextAuthority.traversal.exclusions"),
    source_constraints: sourceConstraints,
    budget: { ...budget, maxTokens },
  };
}

export function assertExecutorDispatchAllowed(request) {
  const authority = requireObject(request?.contextAuthority, "contextAuthority");
  const decision = request?.policyDecision;
  if (decision !== "allow") fail("dispatch_denied", "Executor dispatch requires an allow policy decision.", { decision });

  const lineage = requireObject(request?.contextLineage, "contextLineage");
  const identity = requireObject(authority.identity, "contextAuthority.identity");
  for (const [lineageField, identityField] of [["runId", "runId"], ["sessionId", "sessionId"], ["turnId", "turnId"]]) {
    const lineageValue = requireString(lineage[lineageField], `contextLineage.${lineageField}`);
    const identityValue = requireString(identity[identityField], `contextAuthority.identity.${identityField}`);
    if (lineageValue !== identityValue) fail("lineage_mismatch", "Executor lineage does not match validated context authority.", { field: lineageField, lineageValue, identityValue });
  }

  buildBoundedGraphQuery(authority);
  return true;
}
