const CANDIDATE_SCHEMA = 'govibe-provider-candidate/v1';
const RUN_RESULT_SCHEMA = 'govibe-provider-run-result/v1';

export class ProviderInvocationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProviderInvocationError';
    this.code = code;
  }
}

function candidateFrom(providerId, providerVersion, context, output) {
  return {
    schema: CANDIDATE_SCHEMA,
    provider_id: providerId,
    provider_version: providerVersion,
    request_id: context.executionBinding.binding_id,
    source_manifest: output?.source_manifest ?? [],
    requested_scope: output?.requested_scope ?? {},
    assumptions: output?.assumptions ?? [],
    artifacts: output?.artifacts ?? [],
    relation_candidates: output?.relation_candidates ?? [],
    verification_hints: output?.verification_hints ?? [],
  };
}

function baseResult(providerId, providerVersion, context, output) {
  return {
    schema: RUN_RESULT_SCHEMA,
    binding_id: context.executionBinding.binding_id,
    provider_request_id: output?.provider_request_id ?? null,
    provider_session_id: context.providerSession?.provider_session_id ?? context.executionBinding.provider_session_id ?? null,
    status: 'completed',
    candidate: candidateFrom(providerId, providerVersion, context, output),
    normalized_errors: [],
    retryable: false,
  };
}

/**
 * Local compute adapter. The host owns the process, so wall-clock seconds are the
 * only honest unit: there is no provider quota and no token accounting to read.
 */
export function createLocalComputeAdapter({
  providerId = 'local',
  adapterId = `adapter-${providerId}`,
  providerVersion = null,
  run,
  clock = () => new Date(),
} = {}) {
  if (typeof run !== 'function') throw new ProviderInvocationError('PROVIDER_REJECTED', 'local compute adapter requires a run function');

  return Object.freeze({
    provider_id: providerId,
    adapter_id: adapterId,
    credential_modes: Object.freeze(['none']),
    capabilities: Object.freeze(['local-compute']),
    async execute(request, context) {
      const startedAt = clock();
      const output = await run(request, context);
      const completedAt = clock();
      return {
        ...baseResult(providerId, providerVersion, context, output),
        provider_usage: {
          unit: 'second',
          request_count: 1,
          duration_seconds: Math.max(0, (completedAt.getTime() - startedAt.getTime()) / 1000),
        },
      };
    },
    async cancel(runId) {
      throw new ProviderInvocationError('PROVIDER_CANCELLED', `local run cancelled: ${runId}`);
    },
  });
}

/**
 * Subscription/CLI-backed adapter. A subscription surface exposes request-level
 * throttling and nothing else, so this adapter reports a request count and leaves
 * every token and quota field absent rather than deriving one.
 */
export function createSubscriptionCliAdapter({
  providerId,
  adapterId = `adapter-${providerId}`,
  providerVersion = null,
  run,
  classifyFailure = null,
  deriveCredential = null,
} = {}) {
  if (typeof providerId !== 'string' || providerId.trim() === '') {
    throw new ProviderInvocationError('PROVIDER_REJECTED', 'subscription adapter requires a provider id');
  }
  if (typeof run !== 'function') throw new ProviderInvocationError('PROVIDER_REJECTED', 'subscription adapter requires a run function');
  if (deriveCredential != null && typeof deriveCredential !== 'function') {
    throw new ProviderInvocationError('PROVIDER_REJECTED', 'credential deriver must be a function');
  }

  const classify = classifyFailure ?? ((error) => {
    if (/rate.?limit|429|quota exceeded/i.test(error?.message ?? '')) return 'PROVIDER_RATE_LIMITED';
    if (/timed? ?out|ETIMEDOUT/i.test(error?.message ?? '')) return 'PROVIDER_TIMED_OUT';
    if (/unavailable|ECONNREFUSED|ENOTFOUND|not installed/i.test(error?.message ?? '')) return 'PROVIDER_UNAVAILABLE';
    return null;
  });

  return Object.freeze({
    provider_id: providerId,
    adapter_id: adapterId,
    credential_modes: Object.freeze(deriveCredential ? ['none', 'derived_token'] : ['none', 'raw_secret']),
    capabilities: Object.freeze(['external-agent']),
    ...(deriveCredential ? { deriveCredential } : {}),
    async execute(request, context) {
      let output;
      try {
        output = await run(request, context);
      } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : classify(error);
        throw new ProviderInvocationError(code ?? 'PROVIDER_REJECTED', error?.message ?? 'provider invocation failed');
      }
      return {
        ...baseResult(providerId, providerVersion, context, output),
        // A subscription surface bills requests. Token counts are not exposed, so
        // they stay absent instead of being inferred from a request count.
        provider_usage: { unit: 'request', request_count: 1 },
      };
    },
    async cancel(runId) {
      throw new ProviderInvocationError('PROVIDER_CANCELLED', `subscription run cancelled: ${runId}`);
    },
  });
}
