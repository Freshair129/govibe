import { describe, expect, it } from 'vitest';
import {
  ADAPTER_DESCRIPTOR_SCHEMA,
  createLocalComputeAdapter,
  createSubscriptionCliAdapter,
} from './provider-adapters.mjs';

describe('bounded provider adapter contract', () => {
  it('exposes normalized inspect/execute/cancel surface for local compute', async () => {
    const cancelled = [];
    const adapter = createLocalComputeAdapter({
      providerId: 'local',
      adapterId: 'adapter-local-v2',
      providerVersion: 'local-test',
      run: async () => ({ artifacts: ['artifact.txt'] }),
      cancel: async (runId) => { cancelled.push(runId); return { cancelled: true }; },
    });

    expect(adapter.inspect()).toEqual({
      schema: ADAPTER_DESCRIPTOR_SCHEMA,
      provider_id: 'local',
      adapter_id: 'adapter-local-v2',
      provider_version: 'local-test',
      execution_surface: 'local_runtime',
      credential_modes: ['none'],
      capabilities: ['local-compute'],
    });
    expect(typeof adapter.execute).toBe('function');
    expect(typeof adapter.cancel).toBe('function');
    await expect(adapter.cancel('run-local')).resolves.toEqual({ cancelled: true });
    expect(cancelled).toEqual(['run-local']);
  });

  it('never advertises raw_secret for subscription/CLI execution', () => {
    const uncredentialed = createSubscriptionCliAdapter({
      providerId: 'codex',
      adapterId: 'adapter-codex-cli',
      run: async () => ({}),
    });
    expect(uncredentialed.inspect()).toMatchObject({
      schema: ADAPTER_DESCRIPTOR_SCHEMA,
      provider_id: 'codex',
      adapter_id: 'adapter-codex-cli',
      execution_surface: 'cli',
      credential_modes: ['none'],
    });
    expect(uncredentialed.credential_modes).not.toContain('raw_secret');

    const protectedAdapter = createSubscriptionCliAdapter({
      providerId: 'codex',
      adapterId: 'adapter-codex-cli',
      run: async () => ({}),
      deriveCredential: async () => ({ token: 'derived-run-token', token_type: 'opaque' }),
    });
    expect(protectedAdapter.inspect().credential_modes).toEqual(['none', 'derived_token']);
    expect(protectedAdapter.credential_modes).not.toContain('raw_secret');
  });

  it('normalizes provider-specific cancellation through the adapter callback', async () => {
    const adapter = createSubscriptionCliAdapter({
      providerId: 'codex',
      adapterId: 'adapter-codex-cli',
      run: async () => ({}),
      cancel: async (runId) => ({ provider_request_id: runId, cancelled: true }),
    });
    await expect(adapter.cancel('provider-run-17')).resolves.toEqual({
      provider_request_id: 'provider-run-17',
      cancelled: true,
    });
  });
});
