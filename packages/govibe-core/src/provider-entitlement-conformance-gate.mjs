export const CONFORMANCE_GATE_SCHEMA = 'govibe-provider-entitlement-conformance-gate/v1';
export const CONFORMANCE_EVIDENCE_SCHEMA = 'govibe-provider-entitlement-conformance-evidence/v1';

const REQUIRED_GATES = Object.freeze([
  'repository_contracts',
  'credential_session_isolation',
  'context_integrity',
  'failover_lineage',
  'usage_semantics',
  'durable_usage_ledger',
  'live_provider_execution',
  'human_security_release_review',
]);

const STATES = new Set(['PASS', 'FAIL', 'BLOCKED']);
const SOURCE_KINDS = new Set(['ci', 'runtime', 'provider', 'human_review']);

export class ConformanceGateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConformanceGateError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new ConformanceGateError(code, message, details);
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') fail('CONFORMANCE_EVIDENCE_INVALID', `${field} is required`, { field });
  return value.trim();
}

function normalizeEvidence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('CONFORMANCE_EVIDENCE_INVALID', 'evidence must be an object');
  if (input.schema !== CONFORMANCE_EVIDENCE_SCHEMA) {
    fail('CONFORMANCE_EVIDENCE_INVALID', `schema must be ${CONFORMANCE_EVIDENCE_SCHEMA}`, { field: 'schema' });
  }
  const gate = requiredString(input.gate, 'gate');
  if (!REQUIRED_GATES.includes(gate)) fail('CONFORMANCE_EVIDENCE_INVALID', `unknown gate: ${gate}`, { gate });
  const state = requiredString(input.state, 'state').toUpperCase();
  if (!STATES.has(state)) fail('CONFORMANCE_EVIDENCE_INVALID', `unsupported state: ${state}`, { state });
  const sourceKind = requiredString(input.source_kind, 'source_kind');
  if (!SOURCE_KINDS.has(sourceKind)) fail('CONFORMANCE_EVIDENCE_INVALID', `unsupported source_kind: ${sourceKind}`, { source_kind: sourceKind });
  const evidenceRef = requiredString(input.evidence_ref, 'evidence_ref');

  if (gate === 'live_provider_execution' && state === 'PASS' && sourceKind !== 'provider') {
    fail('CONFORMANCE_FALSE_PASS', 'live provider execution can pass only with provider-sourced evidence', { gate, source_kind: sourceKind });
  }
  if (gate === 'human_security_release_review' && state === 'PASS' && sourceKind !== 'human_review') {
    fail('CONFORMANCE_FALSE_PASS', 'human security/release review can pass only with human-review evidence', { gate, source_kind: sourceKind });
  }
  if (gate === 'durable_usage_ledger' && state === 'PASS' && sourceKind !== 'runtime') {
    fail('CONFORMANCE_FALSE_PASS', 'durable usage ledger can pass only with runtime persistence evidence', { gate, source_kind: sourceKind });
  }

  return Object.freeze({
    schema: CONFORMANCE_EVIDENCE_SCHEMA,
    gate,
    state,
    source_kind: sourceKind,
    evidence_ref: evidenceRef,
    note: input.note == null ? null : String(input.note),
  });
}

export function evaluateProviderEntitlementConformanceGate(evidence = []) {
  if (!Array.isArray(evidence)) fail('CONFORMANCE_EVIDENCE_INVALID', 'evidence must be an array');
  const byGate = new Map();
  for (const raw of evidence) {
    const item = normalizeEvidence(raw);
    if (byGate.has(item.gate)) fail('CONFORMANCE_EVIDENCE_DUPLICATE', `duplicate evidence for gate: ${item.gate}`, { gate: item.gate });
    byGate.set(item.gate, item);
  }

  const rows = REQUIRED_GATES.map((gate) => byGate.get(gate) ?? Object.freeze({
    schema: CONFORMANCE_EVIDENCE_SCHEMA,
    gate,
    state: 'BLOCKED',
    source_kind: 'ci',
    evidence_ref: 'missing:evidence',
    note: 'required evidence is missing',
  }));

  const failed = rows.filter((row) => row.state === 'FAIL');
  const blocked = rows.filter((row) => row.state === 'BLOCKED');
  const status = failed.length > 0 ? 'FAIL' : blocked.length > 0 ? 'BLOCKED' : 'PASS';

  return Object.freeze({
    schema: CONFORMANCE_GATE_SCHEMA,
    status,
    releasable: status === 'PASS',
    required_gates: REQUIRED_GATES,
    evidence: Object.freeze(rows),
    failed_gates: Object.freeze(failed.map((row) => row.gate)),
    blocked_gates: Object.freeze(blocked.map((row) => row.gate)),
  });
}

export function assertProviderEntitlementReleaseAllowed(evidence = []) {
  const result = evaluateProviderEntitlementConformanceGate(evidence);
  if (!result.releasable) {
    fail(
      result.status === 'FAIL' ? 'CONFORMANCE_GATE_FAILED' : 'CONFORMANCE_GATE_BLOCKED',
      `provider entitlement release gate is ${result.status}`,
      { failed_gates: result.failed_gates, blocked_gates: result.blocked_gates },
    );
  }
  return result;
}
