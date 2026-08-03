const REBIND_REQUEST_SCHEMA = 'govibe-execution-rebind-request/v1';
const DECISION_SCHEMA = 'govibe-scheduler-decision/v1';

const AFFINITY_DIMENSIONS = ['workspace_id', 'project_id', 'agent_id', 'workflow_id', 'provider_id', 'model_family'];

// Weights are relative preference only. No component may act as an authorization
// gate: scoring runs strictly over targets the planner already authorized.
const WEIGHTS = Object.freeze({
  capability_fit: 0.35,
  quota: 0.25,
  reliability: 0.2,
  queue: 0.1,
  affinity: 0.1,
});

const NEUTRAL_QUOTA_SCORE = 0.5;

export class ExecutionRoutingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ExecutionRoutingError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new ExecutionRoutingError(code, message, details);
}

function assert(condition, code, message, details) {
  if (!condition) fail(code, message, details);
}

function requiredString(value, field, code = 'INVALID_ROUTING_REQUEST') {
  assert(typeof value === 'string' && value.trim().length > 0, code, `${field} must be a non-empty string`, { field });
  return value.trim();
}

function stringArray(value, field) {
  if (value == null) return [];
  assert(Array.isArray(value), 'INVALID_ROUTING_REQUEST', `${field} must be an array`, { field });
  return value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
}

function unitScore(value, field) {
  if (value == null) return null;
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1, 'INVALID_ROUTING_REQUEST', `${field} must be between 0 and 1`, { field });
  return value;
}

export function affinityKeyOf(scope = {}) {
  return AFFINITY_DIMENSIONS.map((dimension) => `${dimension}=${scope[dimension] ?? '*'}`).join('|');
}

function targetKey(target) {
  return `${target.provider_id}:${target.entitlement_id}:${target.model_id}`;
}

/**
 * Quota contributes a preference signal, never a capacity number.
 *
 * A provider whose limit semantics are unknown, or that only exposes rate-limit
 * state, scores neutral and is reported as `unknown`. It is never converted into
 * an exact token capacity, which API-008 section 14 prohibits.
 */
export function scoreQuota(snapshot) {
  if (!snapshot) return { score: NEUTRAL_QUOTA_SCORE, signal: 'unknown', reason: 'NO_QUOTA_SNAPSHOT' };

  if (snapshot.observed_rate_limit?.limited === true) {
    return { score: 0, signal: 'observed_rate_limit', reason: 'PROVIDER_RATE_LIMITED' };
  }

  if (snapshot.visibility === 'detailed' && snapshot.reported?.remaining != null) {
    return {
      score: snapshot.reported.remaining > 0 ? 1 : 0,
      signal: 'provider_reported',
      reason: snapshot.reported.remaining > 0 ? 'REPORTED_REMAINING' : 'REPORTED_EXHAUSTED',
    };
  }

  // A scheduler capacity score is an internal operational estimate. It is usable
  // as a preference input but is never attributed to the provider.
  if (snapshot.estimated?.capacity_score != null && snapshot.source !== 'provider') {
    return { score: snapshot.estimated.capacity_score, signal: 'scheduler_estimated', reason: 'CAPACITY_ESTIMATE' };
  }

  return { score: NEUTRAL_QUOTA_SCORE, signal: 'unknown', reason: 'UNKNOWN_QUOTA_SEMANTICS' };
}

function capabilityFit(target, requiredCapabilities) {
  if (requiredCapabilities.length === 0) return 1;
  const available = new Set(target.resolved_capabilities ?? []);
  if (available.size === 0) return 1;
  const matched = requiredCapabilities.filter((capability) => available.has(capability)).length;
  return matched / requiredCapabilities.length;
}

function describeDowngrades(selected, preferred) {
  if (!preferred) return [];
  const downgrades = [];
  if (selected.model_id !== preferred.model_id) {
    downgrades.push({ kind: 'model', from: preferred.model_id, to: selected.model_id });
  }
  if (selected.provider_id !== preferred.provider_id) {
    downgrades.push({ kind: 'provider', from: preferred.provider_id, to: selected.provider_id });
  }
  if (preferred.maximum_context_tokens != null && selected.maximum_context_tokens != null
    && selected.maximum_context_tokens < preferred.maximum_context_tokens) {
    downgrades.push({ kind: 'context_limit', from: preferred.maximum_context_tokens, to: selected.maximum_context_tokens });
  }
  const preferredVisibility = preferred.usage_visibility;
  if (preferredVisibility === 'detailed' && selected.usage_visibility !== 'detailed') {
    downgrades.push({ kind: 'usage_visibility', from: preferredVisibility, to: selected.usage_visibility });
  }
  return downgrades;
}

export function normalizeRebindRequest(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'INVALID_REBIND_REQUEST', 'rebind request must be an object');
  const schema = input.schema ?? REBIND_REQUEST_SCHEMA;
  assert(schema === REBIND_REQUEST_SCHEMA, 'REBIND_SCHEMA_UNSUPPORTED', `rebind schema must be ${REBIND_REQUEST_SCHEMA}`, { schema });

  return Object.freeze({
    schema: REBIND_REQUEST_SCHEMA,
    rebind_request_id: requiredString(input.rebind_request_id, 'rebind_request_id', 'INVALID_REBIND_REQUEST'),
    previous_binding_id: requiredString(input.previous_binding_id, 'previous_binding_id', 'INVALID_REBIND_REQUEST'),
    context_id: requiredString(input.context_id, 'context_id', 'INVALID_REBIND_REQUEST'),
    context_hash: requiredString(input.context_hash, 'context_hash', 'INVALID_REBIND_REQUEST'),
    failure_code: requiredString(input.failure_code, 'failure_code', 'INVALID_REBIND_REQUEST'),
    fallback_policy_id: requiredString(input.fallback_policy_id, 'fallback_policy_id', 'INVALID_REBIND_REQUEST'),
    required_capabilities: Object.freeze(stringArray(input.required_capabilities, 'required_capabilities')),
    exclude_targets: Object.freeze(stringArray(input.exclude_targets, 'exclude_targets')),
  });
}

export function createExecutionRouter({
  planner,
  bindingService,
  quotaSource = null,
  reliabilitySource = null,
  queueDepthSource = null,
  clock = () => new Date(),
  idFactory = null,
} = {}) {
  assert(typeof planner?.plan === 'function', 'INVALID_ROUTER_CONFIGURATION', 'a capability planner is required');
  assert(typeof bindingService?.createBinding === 'function', 'INVALID_ROUTER_CONFIGURATION', 'an execution binding service is required');

  const decisions = [];
  const affinity = new Map();
  let sequence = 0;

  const nextId = () => {
    sequence += 1;
    return idFactory ? `sched_${idFactory(sequence)}` : `sched_${sequence}`;
  };

  function scoreTargets(targets, { requiredCapabilities, affinityTarget }) {
    return targets.map((target) => {
      const key = targetKey(target);
      const quota = scoreQuota(quotaSource?.(target) ?? null);
      const fit = capabilityFit(target, requiredCapabilities);
      const reliability = unitScore(reliabilitySource?.(target) ?? null, 'reliability') ?? NEUTRAL_QUOTA_SCORE;
      const queueDepth = queueDepthSource?.(target) ?? null;
      const queue = queueDepth == null ? NEUTRAL_QUOTA_SCORE : 1 / (1 + Math.max(0, queueDepth));
      const affinityHit = affinityTarget != null && affinityTarget === key;

      const score = (fit * WEIGHTS.capability_fit)
        + (quota.score * WEIGHTS.quota)
        + (reliability * WEIGHTS.reliability)
        + (queue * WEIGHTS.queue)
        + ((affinityHit ? 1 : 0) * WEIGHTS.affinity);

      return {
        target,
        target_key: key,
        score: Number(score.toFixed(6)),
        components: Object.freeze({
          capability_fit: fit,
          quota: quota.score,
          reliability,
          queue,
          affinity: affinityHit ? 1 : 0,
        }),
        quota_signal: quota.signal,
        quota_reason: quota.reason,
        affinity_hit: affinityHit,
      };
    }).sort((left, right) => (right.score - left.score) || left.target_key.localeCompare(right.target_key));
  }

  function recordDecision(record) {
    const decision = Object.freeze({
      schema: DECISION_SCHEMA,
      decision_id: nextId(),
      ...record,
      // Restated on every record so an evidence reader never has to infer it.
      affinity_is_optimization_only: true,
      quota_signals_are_not_capacity: true,
      decided_at: clock().toISOString(),
    });
    decisions.push(decision);
    return decision;
  }

  function selectTarget({ planningRequest, excludeTargets, affinityScope, preferredTarget, reason, failureCode = null, previousBindingId = null }) {
    // Authorization first: the planner decides who is eligible. Routing never adds
    // a target and never resurrects one the planner rejected.
    const plan = planner.plan(planningRequest);
    const excluded = new Set(excludeTargets);
    const available = plan.eligible_targets.filter((target) => !excluded.has(targetKey(target)) && !excluded.has(target.provider_id));

    const affinityKey = affinityScope ? affinityKeyOf(affinityScope) : null;
    const affinityTarget = affinityKey ? affinity.get(affinityKey) ?? null : null;
    const scored = scoreTargets(available, {
      requiredCapabilities: planningRequest?.required_capabilities ?? [],
      affinityTarget,
    });

    if (scored.length === 0) {
      const decision = recordDecision({
        reason,
        failure_code: failureCode,
        previous_binding_id: previousBindingId,
        affinity_key: affinityKey,
        affinity_target_key: affinityTarget,
        affinity_target_still_eligible: false,
        excluded_targets: Object.freeze([...excluded]),
        candidates: Object.freeze([]),
        selected_target_key: null,
        downgrades: Object.freeze([]),
        outcome: 'NO_ELIGIBLE_TARGET',
      });
      fail('NO_AUTHORIZED_ENTITLEMENT', 'no authorized entitlement remains after exclusions', {
        decision_id: decision.decision_id,
        excluded_targets: [...excluded],
        rejected_targets: plan.rejected_targets,
      });
    }

    const winner = scored[0];
    const downgrades = describeDowngrades(winner.target, preferredTarget);

    const decision = recordDecision({
      reason,
      failure_code: failureCode,
      previous_binding_id: previousBindingId,
      affinity_key: affinityKey,
      affinity_target_key: affinityTarget,
      affinity_target_still_eligible: affinityTarget != null && scored.some((entry) => entry.target_key === affinityTarget),
      excluded_targets: Object.freeze([...excluded]),
      candidates: Object.freeze(scored.map((entry) => Object.freeze({
        target_key: entry.target_key,
        provider_id: entry.target.provider_id,
        entitlement_id: entry.target.entitlement_id,
        model_id: entry.target.model_id,
        score: entry.score,
        components: entry.components,
        quota_signal: entry.quota_signal,
        quota_reason: entry.quota_reason,
        affinity_hit: entry.affinity_hit,
      }))),
      selected_target_key: winner.target_key,
      downgrades: Object.freeze(downgrades.map((entry) => Object.freeze(entry))),
      outcome: 'SELECTED',
    });

    if (affinityKey) affinity.set(affinityKey, winner.target_key);
    return { target: winner.target, decision, plan };
  }

  function route({ planning_request, binding_request, affinity_scope = null, exclude_targets = [], preferred_target = null } = {}) {
    const { target, decision } = selectTarget({
      planningRequest: planning_request,
      excludeTargets: stringArray(exclude_targets, 'exclude_targets'),
      affinityScope: affinity_scope,
      preferredTarget: preferred_target,
      reason: 'INITIAL_ROUTE',
    });

    const binding = bindingService.createBinding({
      ...binding_request,
      eligible_target: target,
      policy_decision_refs: [...target.policy_refs, `scheduler:${decision.decision_id}`],
    });

    return Object.freeze({ binding, decision });
  }

  function rebind({ rebind_request, planning_request, binding_request, previous_binding, affinity_scope = null } = {}) {
    const request = normalizeRebindRequest(rebind_request);

    assert(previous_binding && typeof previous_binding === 'object', 'PREVIOUS_BINDING_REQUIRED', 'the previous binding is required to rebind');
    assert(
      previous_binding.binding_id === request.previous_binding_id,
      'PREVIOUS_BINDING_MISMATCH',
      'rebind request does not name the supplied previous binding',
      { field: 'previous_binding_id' },
    );

    // A rebind is an execution-lineage event. Changed context is a context-lineage
    // event and requires a new MSP packet, never a rebind.
    assert(
      previous_binding.context_id === request.context_id && previous_binding.context_hash === request.context_hash,
      'CONTEXT_LINEAGE_CHANGED',
      'a context change requires new MSP context lineage, not an execution rebind',
      { field: previous_binding.context_id === request.context_id ? 'context_hash' : 'context_id' },
    );

    const excluded = [...new Set([...request.exclude_targets, targetKey({
      provider_id: previous_binding.provider_id,
      entitlement_id: previous_binding.entitlement_id,
      model_id: previous_binding.model_id,
    })])];

    const { target, decision } = selectTarget({
      planningRequest: planning_request,
      excludeTargets: excluded,
      affinityScope: affinity_scope,
      preferredTarget: {
        provider_id: previous_binding.provider_id,
        model_id: previous_binding.model_id,
        maximum_context_tokens: previous_binding.maximum_context_tokens ?? null,
        usage_visibility: previous_binding.usage_visibility ?? null,
      },
      reason: 'FAILOVER_REBIND',
      failureCode: request.failure_code,
      previousBindingId: request.previous_binding_id,
    });

    const binding = bindingService.createBinding({
      ...binding_request,
      eligible_target: target,
      policy_decision_refs: [...target.policy_refs, `scheduler:${decision.decision_id}`, `rebind:${request.rebind_request_id}`],
    });

    assert(binding.binding_id !== previous_binding.binding_id, 'REBIND_BINDING_NOT_NEW', 'a rebind must produce a new binding id');
    assert(
      binding.context_id === previous_binding.context_id && binding.context_hash === previous_binding.context_hash,
      'CONTEXT_LINEAGE_CHANGED',
      'rebind must preserve the context identity and hash',
    );

    return Object.freeze({ binding, decision, previous_binding_id: previous_binding.binding_id });
  }

  return Object.freeze({
    route,
    rebind,
    affinityFor(scope) { return affinity.get(affinityKeyOf(scope)) ?? null; },
    decisions() { return Object.freeze([...decisions]); },
  });
}
