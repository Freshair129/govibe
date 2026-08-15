import { describe, expect, it } from 'vitest';
import {
  CONFORMANCE_EVIDENCE_SCHEMA,
  assertProviderEntitlementReleaseAllowed,
  evaluateProviderEntitlementConformanceGate,
} from './provider-entitlement-conformance-gate.mjs';

function row(gate, state = 'PASS', sourceKind = 'ci', evidenceRef = `ci:${gate}`) {
  return {
    schema: CONFORMANCE_EVIDENCE_SCHEMA,
    gate,
    state,
    source_kind: sourceKind,
    evidence_ref: evidenceRef,
  };
}

function repositoryEvidence() {
  return [
    row('repository_contracts'),
    row('credential_session_isolation'),
    row('context_integrity'),
    row('failover_lineage'),
    row('usage_semantics'),
  ];
}

describe('#64 provider entitlement conformance release gate', () => {
  it('reports BLOCKED when repository conformance passes but production evidence is missing', () => {
    const result = evaluateProviderEntitlementConformanceGate(repositoryEvidence());
    expect(result.status).toBe('BLOCKED');
    expect(result.releasable).toBe(false);
    expect(result.failed_gates).toEqual([]);
    expect(result.blocked_gates).toEqual([
      'durable_usage_ledger',
      'live_provider_execution',
      'human_security_release_review',
    ]);
  });

  it('cannot convert documentation or CI assertions into live-provider or human-review PASS evidence', () => {
    expect(() => evaluateProviderEntitlementConformanceGate([
      ...repositoryEvidence(),
      row('durable_usage_ledger', 'PASS', 'runtime', 'runtime:ledger-restart-proof'),
      row('live_provider_execution', 'PASS', 'ci', 'docs:claims-live-provider'),
      row('human_security_release_review', 'PASS', 'human_review', 'review:security-1'),
    ])).toThrowError(expect.objectContaining({ code: 'CONFORMANCE_FALSE_PASS' }));

    expect(() => evaluateProviderEntitlementConformanceGate([
      ...repositoryEvidence(),
      row('durable_usage_ledger', 'PASS', 'runtime', 'runtime:ledger-restart-proof'),
      row('live_provider_execution', 'PASS', 'provider', 'provider:run-1'),
      row('human_security_release_review', 'PASS', 'ci', 'docs:self-review'),
    ])).toThrowError(expect.objectContaining({ code: 'CONFORMANCE_FALSE_PASS' }));
  });

  it('requires runtime persistence evidence before durable usage ledger can pass', () => {
    expect(() => evaluateProviderEntitlementConformanceGate([
      ...repositoryEvidence(),
      row('durable_usage_ledger', 'PASS', 'ci', 'ci:in-memory-ledger-test'),
    ])).toThrowError(expect.objectContaining({ code: 'CONFORMANCE_FALSE_PASS' }));
  });

  it('FAIL takes precedence over BLOCKED and release assertion fails closed', () => {
    const result = evaluateProviderEntitlementConformanceGate([
      ...repositoryEvidence().filter((item) => item.gate !== 'context_integrity'),
      row('context_integrity', 'FAIL', 'ci', 'ci:context-integrity-failure'),
    ]);
    expect(result.status).toBe('FAIL');
    expect(result.failed_gates).toEqual(['context_integrity']);
    expect(() => assertProviderEntitlementReleaseAllowed(result.evidence)).toThrowError(
      expect.objectContaining({ code: 'CONFORMANCE_GATE_FAILED' }),
    );
  });

  it('allows release only when every required gate has evidence from the correct authority', () => {
    const evidence = [
      ...repositoryEvidence(),
      row('durable_usage_ledger', 'PASS', 'runtime', 'runtime:ledger-restart-proof'),
      row('live_provider_execution', 'PASS', 'provider', 'provider:run-42'),
      row('human_security_release_review', 'PASS', 'human_review', 'review:security-release-2026-08-15'),
    ];
    const result = assertProviderEntitlementReleaseAllowed(evidence);
    expect(result.status).toBe('PASS');
    expect(result.releasable).toBe(true);
    expect(result.blocked_gates).toEqual([]);
  });
});
