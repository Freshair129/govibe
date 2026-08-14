import { describe, expect, it } from 'vitest';
import {
  CREDENTIAL_HANDOFF_MODES,
  DERIVED_HANDOFF_SCHEMA,
  normalizeCredentialMode,
  normalizeDerivedCredentialHandoff,
} from './credential-handoff.mjs';

describe('credential handoff contract', () => {
  it('accepts an opaque derived token without exposing raw material', () => {
    const handoff = normalizeDerivedCredentialHandoff({
      provider_id: 'codex',
      adapter_id: 'adapter-codex',
      binding_id: 'bind-1',
      derived: { token: 'derived-fixture-token', token_type: 'opaque' },
      raw_secret: 'raw-fixture-secret',
    });

    expect(handoff).toEqual({
      schema: DERIVED_HANDOFF_SCHEMA,
      mode: 'derived_token',
      provider_id: 'codex',
      adapter_id: 'adapter-codex',
      binding_id: 'bind-1',
      token_type: 'opaque',
      token: 'derived-fixture-token',
    });
    expect(Object.isFrozen(handoff)).toBe(true);
  });

  it('rejects a deriver that returns raw bytes or credential-shaped fields', () => {
    expect(() => normalizeDerivedCredentialHandoff({
      provider_id: 'codex', adapter_id: 'adapter-codex', binding_id: 'bind-1',
      derived: new TextEncoder().encode('raw-fixture-secret'), raw_secret: 'raw-fixture-secret',
    })).toThrowError(expect.objectContaining({ code: 'CREDENTIAL_HANDOFF_INVALID' }));

    expect(() => normalizeDerivedCredentialHandoff({
      provider_id: 'codex', adapter_id: 'adapter-codex', binding_id: 'bind-1',
      derived: { token: 'derived', secret: 'raw-fixture-secret' }, raw_secret: 'raw-fixture-secret',
    })).toThrowError(expect.objectContaining({ code: 'CREDENTIAL_HANDOFF_INVALID' }));
  });

  it('rejects exact raw-secret reuse without including the secret in the error', () => {
    let error;
    try {
      normalizeDerivedCredentialHandoff({
        provider_id: 'codex', adapter_id: 'adapter-codex', binding_id: 'bind-1',
        derived: 'raw-fixture-secret', raw_secret: 'raw-fixture-secret',
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: 'CREDENTIAL_DERIVATION_RAW_SECRET_REUSED' });
    expect(`${error.message}|${JSON.stringify(error.details)}`).not.toContain('raw-fixture-secret');
  });

  it('normalizes only the explicit supported modes', () => {
    expect(CREDENTIAL_HANDOFF_MODES).toEqual(['none', 'raw_secret', 'derived_token']);
    expect(normalizeCredentialMode(undefined)).toBeNull();
    expect(normalizeCredentialMode('derived_token')).toBe('derived_token');
    expect(() => normalizeCredentialMode('oauth-session')).toThrowError(
      expect.objectContaining({ code: 'CREDENTIAL_MODE_INVALID' }),
    );
  });
});
