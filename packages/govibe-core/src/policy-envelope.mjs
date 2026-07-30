const SHARED_REGISTRY = '.govibe/skills';
const POLICY = {
  covibe: new Set(['private_workflow', 'plan', 'scan', 'review', 'optimize']),
  codev: new Set(['plan', 'scan', 'review']),
};

export function createPolicyEnvelope(mode, authority) {
  if (!POLICY[mode]) throw new Error(`Unknown policy mode: ${mode}`);
  return { schema: 'govibe-policy-envelope/v1', mode, authority, skillRegistry: SHARED_REGISTRY, allowedActions: [...POLICY[mode]].sort() };
}

export function assertPolicyAllows(envelope, action) {
  if (!envelope.allowedActions?.includes(action)) { const error = new Error(`Policy denied action: ${action}`); error.code = 'POLICY_DENIED'; throw error; }
}
