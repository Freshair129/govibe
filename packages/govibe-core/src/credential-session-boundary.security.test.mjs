/**
 * Negative security matrix for issue #59, at the dispatch boundary.
 *
 * The unit tests in credential-vault.test.mjs and provider-session-registry.test.mjs
 * already prove the vault and the session registry reject bad input. What they do
 * not prove is the issue #59 acceptance criterion that matters operationally:
 * that a revoked, expired, replayed or foreign credential or session stops
 * execution *before the provider is invoked*.
 *
 * Every test here therefore asserts on a spy that the adapter was never called,
 * not merely that a promise rejected.
 */
import { describe, expect, it, vi } from 'vitest';
import { createCredentialVault, createInMemorySecretBackend } from './credential-vault.mjs';
import { createExecutorRegistry } from './executor-adapter.mjs';
import { createProviderSessionRegistry } from './provider-session-registry.mjs';

const SECRET = 'sk-live-boundary-must-not-leak';
const PROVIDER = 'alpha';

function contextAuthority() {
  return {
    schemaVersion: 'govibe-context-authority/v1',
    identity: { taskId: 'task-1', agentId: 'agent-1', workspaceId: 'ws-1', runId: 'run-1', sessionId: 'session-1', turnId: 'turn-1' },
    lineage: { contextId: 'ctx-1', cacheId: 'cache-1' },
    unresolvedAssumptions: [],
    traversal: { relationAllowlist: ['contains'], retrievalRadius: 1, inclusions: [], exclusions: [] },
    sources: [{ id: 'doc-1', version: '1', hash: 'a'.repeat(64) }],
    budget: { maxTokens: 512 },
    knowledgeRefs: ['gks:doc-1'],
    requiredReasonRefs: ['policy:reason:1'],
  };
}

function binding(overrides = {}) {
  return {
    schema: 'govibe-execution-binding/v1',
    binding_id: 'binding-1',
    actor_id: 'user-1',
    principal_id: 'user-1',
    workspace_id: 'ws-1',
    task_id: 'task-1',
    agent_id: 'agent-1',
    run_id: 'run-1',
    session_id: 'session-1',
    turn_id: 'turn-1',
    context_id: 'ctx-1',
    cache_id: 'cache-1',
    provider_id: PROVIDER,
    entitlement_id: 'ent-1',
    credential_grant_id: null,
    provider_session_id: null,
    ...overrides,
  };
}

function request(bindingOverrides = {}, requestOverrides = {}) {
  return {
    actor_id: 'user-1',
    run_id: 'run-1',
    contextAuthority: contextAuthority(),
    policyDecision: 'allow',
    contextLineage: { runId: 'run-1', sessionId: 'session-1', turnId: 'turn-1' },
    executionBinding: binding(bindingOverrides),
    ...requestOverrides,
  };
}

function harness({ clock = () => new Date('2026-08-04T00:00:00.000Z') } = {}) {
  const adapter = {
    capabilities: ['api-llm'],
    execute: vi.fn(async () => ({ status: 'completed' })),
    cancel: vi.fn(async () => {}),
  };
  let grantId = 0;
  let sessionId = 0;
  const credentialVault = createCredentialVault({
    backend: createInMemorySecretBackend(),
    clock,
    idFactory: () => { grantId += 1; return String(grantId); },
  });
  const sessionRegistry = createProviderSessionRegistry({
    clock,
    idFactory: () => { sessionId += 1; return String(sessionId); },
  });
  const registry = createExecutorRegistry({ [PROVIDER]: adapter }, { credentialVault, sessionRegistry });

  credentialVault.registerCredential({
    credential_ref: 'cred-1',
    entitlement_id: 'ent-1',
    owner_id: 'user-1',
    provider_id: PROVIDER,
    secret: SECRET,
  });

  const grantFor = (overrides = {}) => credentialVault.issueGrant({
    credential_ref: 'cred-1',
    entitlement_id: 'ent-1',
    principal_id: 'user-1',
    run_id: 'run-1',
    binding_id: 'binding-1',
    provider_id: PROVIDER,
    ...overrides,
  });

  const sessionFor = (overrides = {}) => sessionRegistry.createSession({
    principal_id: 'user-1',
    entitlement_id: 'ent-1',
    provider_id: PROVIDER,
    run_id: 'run-1',
    binding_id: 'binding-1',
    external_session_id: 'provider-side-session-handle',
    ...overrides,
  });

  return { adapter, credentialVault, sessionRegistry, registry, grantFor, sessionFor };
}

/** Asserts the dispatch failed with `code` and that the provider was never reached. */
async function expectBlockedBeforeProvider(harnessInstance, dispatchRequest, code) {
  await expect(harnessInstance.registry.execute(PROVIDER, dispatchRequest)).rejects.toMatchObject({ code });
  expect(harnessInstance.adapter.execute, 'provider must not be invoked').not.toHaveBeenCalled();
}

describe('#59 negative matrix: credential state blocks execution before provider invocation', () => {
  it('blocks a revoked credential', async () => {
    const h = harness();
    const grant = h.grantFor();
    h.credentialVault.revokeCredential('cred-1');
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: grant.grant_id }), 'CREDENTIAL_GRANT_REVOKED');
  });

  it('blocks an expired credential', async () => {
    let now = new Date('2026-08-04T00:00:00.000Z');
    const h = harness({ clock: () => now });
    h.credentialVault.revokeCredential('cred-1');
    h.credentialVault.registerCredential({
      credential_ref: 'cred-exp',
      entitlement_id: 'ent-1',
      owner_id: 'user-1',
      provider_id: PROVIDER,
      secret: SECRET,
      valid_until: '2026-08-04T00:00:10.000Z',
    });
    const grant = h.credentialVault.issueGrant({
      credential_ref: 'cred-exp',
      entitlement_id: 'ent-1',
      principal_id: 'user-1',
      run_id: 'run-1',
      binding_id: 'binding-1',
      provider_id: PROVIDER,
    });
    now = new Date('2026-08-04T00:00:20.000Z');
    // The grant itself is still inside its TTL here, so this isolates credential
    // expiry rather than grant expiry.
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: grant.grant_id }), 'CREDENTIAL_EXPIRED');
  });

  it('blocks an expired grant even while the credential is still valid', async () => {
    let now = new Date('2026-08-04T00:00:00.000Z');
    const h = harness({ clock: () => now });
    const grant = h.grantFor({ ttl_ms: 1_000 });
    now = new Date('2026-08-04T00:00:05.000Z');
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: grant.grant_id }), 'CREDENTIAL_GRANT_EXPIRED');
  });

  it('blocks an explicitly revoked grant', async () => {
    const h = harness();
    const grant = h.grantFor();
    h.credentialVault.revokeGrant(grant.grant_id);
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: grant.grant_id }), 'CREDENTIAL_GRANT_REVOKED');
  });

  it('blocks stale-token reuse of an already consumed one-time grant', async () => {
    const h = harness();
    const grant = h.grantFor();
    await h.registry.execute(PROVIDER, request({ credential_grant_id: grant.grant_id }));
    expect(h.adapter.execute).toHaveBeenCalledOnce();

    h.adapter.execute.mockClear();
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: grant.grant_id }), 'CREDENTIAL_GRANT_CONSUMED');
  });

  it('blocks an unknown grant id', async () => {
    const h = harness();
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: 'grant_forged' }), 'CREDENTIAL_GRANT_NOT_FOUND');
  });

  it('fails closed when a grant is presented but no vault is configured', async () => {
    const adapter = { capabilities: ['api-llm'], execute: vi.fn(async () => ({})), cancel: vi.fn() };
    const registry = createExecutorRegistry({ [PROVIDER]: adapter });
    await expect(registry.execute(PROVIDER, request({ credential_grant_id: 'grant_1' }))).rejects.toMatchObject({
      code: 'CREDENTIAL_VAULT_REQUIRED',
    });
    expect(adapter.execute).not.toHaveBeenCalled();
  });
});

describe('#59 negative matrix: confused deputy at the dispatch boundary', () => {
  it('blocks a grant issued for another entitlement', async () => {
    const h = harness();
    h.credentialVault.registerCredential({
      credential_ref: 'cred-2',
      entitlement_id: 'ent-2',
      owner_id: 'user-1',
      provider_id: PROVIDER,
      secret: SECRET,
    });
    const foreign = h.credentialVault.issueGrant({
      credential_ref: 'cred-2',
      entitlement_id: 'ent-2',
      principal_id: 'user-1',
      run_id: 'run-1',
      binding_id: 'binding-1',
      provider_id: PROVIDER,
    });
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: foreign.grant_id }), 'CREDENTIAL_GRANT_SCOPE_MISMATCH');
  });

  it('blocks a grant issued for another run', async () => {
    const h = harness();
    const foreign = h.grantFor({ run_id: 'run-2' });
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: foreign.grant_id }), 'CREDENTIAL_GRANT_SCOPE_MISMATCH');
  });

  it('blocks a grant issued for another binding', async () => {
    const h = harness();
    const foreign = h.grantFor({ binding_id: 'binding-2' });
    await expectBlockedBeforeProvider(h, request({ credential_grant_id: foreign.grant_id }), 'CREDENTIAL_GRANT_SCOPE_MISMATCH');
  });

  it('blocks a binding whose principal is not the dispatch actor', async () => {
    const h = harness();
    await expectBlockedBeforeProvider(
      h,
      request({ actor_id: 'user-2', principal_id: 'user-2' }),
      'EXECUTION_BINDING_PRINCIPAL_MISMATCH',
    );
  });

  it('blocks a binding whose actor and principal disagree', async () => {
    const h = harness();
    await expectBlockedBeforeProvider(h, request({ principal_id: 'user-2' }), 'EXECUTION_BINDING_IDENTITY_MISMATCH');
  });

  it('blocks a binding pointed at a different provider', async () => {
    const h = harness();
    await expectBlockedBeforeProvider(h, request({ provider_id: 'beta' }), 'EXECUTION_BINDING_PROVIDER_MISMATCH');
  });
});

describe('#59 negative matrix: provider session isolation at the dispatch boundary', () => {
  it('blocks a session belonging to another user', async () => {
    const h = harness();
    const foreign = h.sessionFor({ principal_id: 'user-2' });
    await expectBlockedBeforeProvider(
      h,
      request({ provider_session_id: foreign.session_id }),
      'PROVIDER_SESSION_SCOPE_MISMATCH',
    );
  });

  it('blocks a session belonging to another entitlement', async () => {
    const h = harness();
    const foreign = h.sessionFor({ entitlement_id: 'ent-2' });
    await expectBlockedBeforeProvider(
      h,
      request({ provider_session_id: foreign.session_id }),
      'PROVIDER_SESSION_SCOPE_MISMATCH',
    );
  });

  it('blocks cross-run session reuse by default', async () => {
    const h = harness();
    const other = h.sessionFor({ run_id: 'run-2' });
    await expectBlockedBeforeProvider(
      h,
      request({ provider_session_id: other.session_id }),
      'PROVIDER_SESSION_RUN_MISMATCH',
    );
  });

  it('blocks a revoked session', async () => {
    const h = harness();
    const session = h.sessionFor();
    h.sessionRegistry.revokeSession(session.session_id);
    await expectBlockedBeforeProvider(h, request({ provider_session_id: session.session_id }), 'PROVIDER_SESSION_REVOKED');
  });

  it('blocks every session of an entitlement once that entitlement is revoked', async () => {
    const h = harness();
    const session = h.sessionFor();
    expect(h.sessionRegistry.revokeByEntitlement('ent-1')).toBe(1);
    await expectBlockedBeforeProvider(h, request({ provider_session_id: session.session_id }), 'PROVIDER_SESSION_REVOKED');
  });

  it('blocks an expired session', async () => {
    let now = new Date('2026-08-04T00:00:00.000Z');
    const h = harness({ clock: () => now });
    const session = h.sessionFor({ ttl_ms: 1_000 });
    now = new Date('2026-08-04T00:00:05.000Z');
    await expectBlockedBeforeProvider(h, request({ provider_session_id: session.session_id }), 'PROVIDER_SESSION_EXPIRED');
  });

  it('fails closed when a session is presented but no session registry is configured', async () => {
    const adapter = { capabilities: ['api-llm'], execute: vi.fn(async () => ({})), cancel: vi.fn() };
    const registry = createExecutorRegistry({ [PROVIDER]: adapter }, { credentialVault: null, sessionRegistry: null });
    await expect(registry.execute(PROVIDER, request({ provider_session_id: 'ps_1' }))).rejects.toMatchObject({
      code: 'PROVIDER_SESSION_REGISTRY_REQUIRED',
    });
    expect(adapter.execute).not.toHaveBeenCalled();
  });
});

describe('#59 negative matrix: the adapter receives only its bound scope', () => {
  it('strips credential-shaped fields and the grant id from the adapter request', async () => {
    const h = harness();
    const grant = h.grantFor();
    await h.registry.execute(PROVIDER, request({ credential_grant_id: grant.grant_id }, {
      api_key: SECRET,
      access_token: SECRET,
      secret: SECRET,
      credential: SECRET,
    }));

    const [safeRequest, context] = h.adapter.execute.mock.calls[0];
    expect(JSON.stringify(safeRequest)).not.toContain(SECRET);
    for (const field of ['api_key', 'access_token', 'secret', 'credential']) {
      expect(safeRequest, field).not.toHaveProperty(field);
    }
    expect(safeRequest.executionBinding).not.toHaveProperty('credential_grant_id');
    expect(Object.keys(safeRequest.executionBinding).sort()).toEqual([
      'binding_id', 'entitlement_id', 'principal_id', 'provider_id', 'provider_session_id', 'run_id',
    ]);
    expect(context.executionBinding.entitlement_id).toBe('ent-1');
  });

  it('gives the adapter no handle to any other credential or session', async () => {
    const h = harness();
    const grant = h.grantFor();
    h.sessionFor({ entitlement_id: 'ent-2', principal_id: 'user-2' });
    await h.registry.execute(PROVIDER, request({ credential_grant_id: grant.grant_id }));

    const [, context] = h.adapter.execute.mock.calls[0];
    expect(Object.keys(context).sort()).toEqual(['credential', 'executionBinding', 'providerSession']);
    expect(context.providerSession).toBeNull();
    expect(context.credential).toBeInstanceOf(Uint8Array);
  });
});

/**
 * These tests PIN CURRENT BEHAVIOR THAT IS WRONG. They are characterization
 * tests for gaps found while building the #59 negative matrix, not approval of
 * the behavior. Each will fail when the gap is closed, which is the intent:
 * whoever fixes it must come here and flip the assertion.
 *
 * Recorded in section 5 of
 * docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md
 */
describe('#59 OPEN GAPS: binding authenticity is not verified at dispatch', () => {
  it('GAP: dispatches a binding the binding service never issued', async () => {
    const h = harness();
    // Nothing ties this object to any issuing service. It only has to be
    // internally consistent and correlate with the context authority.
    await h.registry.execute(PROVIDER, request({ binding_id: 'binding_forged', entitlement_id: 'ent-never-granted' }));
    expect(h.adapter.execute, 'a forged binding currently reaches the provider').toHaveBeenCalledOnce();
  });

  it('GAP: dispatches an expired binding, so API-008 BINDING_EXPIRED is unreachable at dispatch', async () => {
    const h = harness();
    await h.registry.execute(PROVIDER, request({
      authorized_at: '2020-01-01T00:00:00.000Z',
      expires_at: '2020-01-01T00:01:00.000Z',
    }));
    expect(h.adapter.execute, 'an expired binding currently reaches the provider').toHaveBeenCalledOnce();
  });

  it('GAP: dispatches a revoked binding', async () => {
    const h = harness();
    await h.registry.execute(PROVIDER, request({ state: 'revoked', revoked_at: '2026-08-04T00:00:00.000Z' }));
    expect(h.adapter.execute, 'a revoked binding currently reaches the provider').toHaveBeenCalledOnce();
  });

  it('GAP: omitting credential_grant_id skips the vault entirely', async () => {
    const h = harness();
    await h.registry.execute(PROVIDER, request({ credential_grant_id: null }));
    expect(h.adapter.execute).toHaveBeenCalledOnce();
    const [, context] = h.adapter.execute.mock.calls[0];
    expect(context.credential, 'no credential is demanded when the grant id is absent').toBeNull();
  });
});

describe('#59 negative matrix: no credential material in thrown errors', () => {
  it('keeps the secret out of every rejection produced by the boundary', async () => {
    const cases = [
      async () => {
        const h = harness();
        const grant = h.grantFor();
        h.credentialVault.revokeCredential('cred-1');
        return h.registry.execute(PROVIDER, request({ credential_grant_id: grant.grant_id }));
      },
      async () => {
        const h = harness();
        return h.registry.execute(PROVIDER, request({ credential_grant_id: 'grant_forged' }));
      },
      async () => {
        const h = harness();
        const foreign = h.grantFor({ run_id: 'run-2' });
        return h.registry.execute(PROVIDER, request({ credential_grant_id: foreign.grant_id }));
      },
      async () => {
        const h = harness();
        const foreign = h.sessionFor({ principal_id: 'user-2' });
        return h.registry.execute(PROVIDER, request({ provider_session_id: foreign.session_id }));
      },
    ];

    for (const [index, run] of cases.entries()) {
      await expect(run(), `case ${index}`).rejects.toSatisfy((error) => {
        const serialized = `${error.message}|${error.stack ?? ''}|${JSON.stringify(error.details ?? {})}`;
        expect(serialized, `case ${index}`).not.toContain(SECRET);
        expect(serialized, `case ${index}`).not.toContain('provider-side-session-handle');
        return true;
      });
    }
  });

  it('keeps the secret out of vault and session inspection surfaces', async () => {
    const h = harness();
    h.grantFor();
    h.sessionFor();
    expect(JSON.stringify(h.credentialVault.inspect())).not.toContain(SECRET);
    expect(JSON.stringify(h.sessionRegistry.inspect())).not.toContain('provider-side-session-handle');
  });
});
