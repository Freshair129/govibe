import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateProviderEntitlementConformanceGate } from './provider-entitlement-conformance-gate.mjs';

const manifest = JSON.parse(readFileSync(
  path.resolve('docs/assurance/audit/provider-entitlement-conformance-gate.json'),
  'utf8',
));

describe('#64 tracked conformance evidence manifest', () => {
  it('is evaluated by code rather than trusted from the declared expected status', () => {
    const result = evaluateProviderEntitlementConformanceGate(manifest.evidence);
    expect(result.status).toBe(manifest.expected_status);
    expect(result.releasable).toBe(false);
    expect(result.blocked_gates).toEqual([
      'durable_usage_ledger',
      'live_provider_execution',
      'human_security_release_review',
    ]);
  });

  it('contains no PASS claim sourced only from documentation text', () => {
    for (const item of manifest.evidence) {
      if (item.state === 'PASS') {
        expect(item.evidence_ref).not.toMatch(/^docs:/i);
      }
    }
  });
});
