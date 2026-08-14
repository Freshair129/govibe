import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createWorkflowPlan, getWorkflowStatus, transitionWorkflow } from './workflow-engine.mjs';
import { createExecutionBindingService } from './execution-binding-service.mjs';
import { createExecutorRegistry, ProviderUnavailableError } from './executor-adapter.mjs';
import { createPolicyEnvelope, assertPolicyAllows } from './policy-envelope.mjs';
import { reviewWorkspace, optimizeMeasured, workspaceImpact, docsVersion } from './governance-operations.mjs';
import { createProviderCompatibilityRegistry } from './provider-compatibility-registry.mjs';
import { legacyAliasCatalog, resolveToolName, toolCatalog } from '../../../scripts/mcp/registry.mjs';

const roots = [];
async function root() { const value = await mkdtemp(path.join(os.tmpdir(), 'govibe-migration-')); roots.push(value); return value; }
afterEach(async () => Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))));

const COMPAT_POLICY_REF = 'compatibility:compat-codex-migration-v1:1.0.0';

function migrationCompatibilityRecord() {
  return {
    record_id: 'compat-codex-migration-v1',
    schema_version: 'govibe-provider-entitlement-compatibility/v1',
    version: '1.0.0',
    provider: 'codex',
    product: 'codex-migration-test',
    plan: 'test-plan',
    execution_surface: 'cli',
    entitlement_type: 'api',
    owner_type: 'user',
    permitted_user_model: 'owner',
    approved_scope: 'owner_only',
    automation_allowed: false,
    credential_delegation_allowed: false,
    session_reuse_allowed: false,
    session_isolation_domain: null,
    concurrent_use_allowed: false,
    allowed_principals: [],
    allowed_workspaces: [],
    allowed_organizations: [],
    allowed_adapter_ids: ['adapter-codex'],
    quota_visibility: { request_quota: 'unknown' },
    cache_visibility: { provider_session: 'unknown' },
    evidence_refs: ['internal:migration-codex-policy'],
    evidence_hashes: ['sha256:migration-codex-policy-v1'],
    reviewer: 'migration-test',
    approval_state: 'approved_owner_only',
    approved_date: '2026-08-01T00:00:00.000Z',
    expiry_date: '2027-08-01T00:00:00.000Z',
    next_review_date: '2027-02-01T00:00:00.000Z',
    restrictions: [],
    fail_closed_reasons: [],
  };
}

function migrationCompatibilityProof() {
  return {
    authorized: true,
    record_id: 'compat-codex-migration-v1',
    record_version: '1.0.0',
    provider: 'codex',
    product: 'codex-migration-test',
    plan: 'test-plan',
    execution_surface: 'cli',
    entitlement_type: 'api',
    owner_id: 'migration-agent',
    requested_scope: 'owner_only',
    principal_id: 'migration-agent',
    organization_id: 'org-migration',
    workspace_id: 'workspace-migration',
    adapter_id: 'adapter-codex',
    automation_requested: false,
    session_reuse_requested: false,
    concurrent_use_requested: false,
    credential_delegation_requested: false,
    evidence_valid: true,
    policy_ref: COMPAT_POLICY_REF,
  };
}

function governedRequest() {
  return {
    actor_id: 'migration-agent',
    run_id: 'run-migration',
    contextAuthority: {
      schemaVersion: 'govibe-context-authority/v1',
      identity: { taskId: 'TASK-migration', agentId: 'migration-agent', workspaceId: 'workspace-migration', runId: 'run-migration', sessionId: 'session-migration', turnId: 'turn-migration' },
      sources: [{ id: 'API-007', version: '0.1.0', hash: 'a'.repeat(64) }],
      requiredReasonRefs: ['issue:migration'],
      traversal: { relationAllowlist: ['implements'], retrievalRadius: 1, inclusions: [], exclusions: [] },
      knowledgeRefs: [],
      budget: { maxTokens: 1024, compaction: 'bounded' },
      lineage: { contextId: 'ctx-migration', cacheId: 'cache-migration', parentContextId: null },
      unresolvedAssumptions: [],
    },
    contextLineage: { runId: 'run-migration', sessionId: 'session-migration', turnId: 'turn-migration' },
    policyDecision: 'allow',
    executionBinding: {
      schema: 'govibe-execution-binding/v1',
      binding_id: 'binding-migration',
      binding_request_id: 'br-migration',
      actor_id: 'migration-agent',
      principal_id: 'migration-agent',
      organization_id: 'org-migration',
      workspace_id: 'workspace-migration',
      project_id: 'project-migration',
      task_id: 'TASK-migration',
      agent_id: 'migration-agent',
      run_id: 'run-migration',
      session_id: 'session-migration',
      turn_id: 'turn-migration',
      context_id: 'ctx-migration',
      cache_id: 'cache-migration',
      context_hash: 'hash-migration',
      source_manifest_hash: 'manifest-migration',
      context_profile: 'T-ctx',
      tool_contract_hash: 'tools-migration',
      provider_id: 'codex',
      entitlement_id: 'entitlement-migration',
      executor_class: 'external-agent',
      model_id: 'model-migration',
      credential_grant_id: null,
      provider_session_id: null,
      affinity_key: null,
      fallback_policy_id: null,
      quota_snapshot_ref: null,
      policy_decision_refs: ['policy:migration:1'],
      state: 'active',
      authorized_at: '2026-08-03T00:00:00.000Z',
      expires_at: '2026-08-03T00:01:00.000Z',
      revoked_at: null,
    },
  };
}

describe('durable workflow', () => {
  it('creates a deterministic DAG and resumes idempotently from append-only state', async () => {
    const workspacePath = await root();
    const plan = await createWorkflowPlan({ workspacePath, runId: 'run-1', tasks: [
      { id: 'scan', dependsOn: [] }, { id: 'review', dependsOn: ['scan'] },
    ] });
    expect(plan.currentTask).toBe('scan');
    await transitionWorkflow({ workspacePath, runId: 'run-1', taskId: 'scan', status: 'complete', verification: { passed: true } });
    const first = await transitionWorkflow({ workspacePath, runId: 'run-1', taskId: 'review', status: 'running', idempotencyKey: 'start-review' });
    const replay = await transitionWorkflow({ workspacePath, runId: 'run-1', taskId: 'review', status: 'running', idempotencyKey: 'start-review' });
    expect(replay.eventId).toBe(first.eventId);
    expect((await getWorkflowStatus({ workspacePath, runId: 'run-1' })).currentTask).toBe('review');
    expect((await readFile(path.join(workspacePath, 'state', 'runs', 'run-1', 'events.jsonl'), 'utf8')).trim().split('\n')).toHaveLength(3);
    await transitionWorkflow({ workspacePath, runId: 'run-1', taskId: 'review', status: 'paused' });
    await transitionWorkflow({ workspacePath, runId: 'run-1', taskId: 'review', status: 'running' });
    expect((await getWorkflowStatus({ workspacePath, runId: 'run-1' })).tasks.find((task) => task.id === 'review').attempts).toBe(2);
  });

  it('rejects cycles, unmet dependencies, and false completion', async () => {
    const workspacePath = await root();
    await expect(createWorkflowPlan({ workspacePath, runId: 'cycle', tasks: [
      { id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: ['a'] },
    ] })).rejects.toThrow(/cycle/i);
    await createWorkflowPlan({ workspacePath, runId: 'run-2', tasks: [{ id: 'a', dependsOn: [] }, { id: 'b', dependsOn: ['a'] }] });
    await expect(transitionWorkflow({ workspacePath, runId: 'run-2', taskId: 'b', status: 'running' })).rejects.toThrow(/dependency/i);
    await expect(transitionWorkflow({ workspacePath, runId: 'run-2', taskId: 'a', status: 'complete', verification: { passed: false } })).rejects.toThrow(/verification/i);
  });
});

describe('providers and policy', () => {
  it('boots with unavailable providers and fails with a typed error only when selected', async () => {
    const bindingService = createExecutionBindingService({ idFactory: () => 'migration' });
    const proof = migrationCompatibilityProof();
    const issued = bindingService.createBinding({
      binding_request_id: 'br-migration',
      actor_id: 'migration-agent',
      organization_id: 'org-migration',
      workspace_id: 'workspace-migration',
      project_id: 'project-migration',
      task_id: 'TASK-migration',
      agent_id: 'migration-agent',
      run_id: 'run-migration',
      session_id: 'session-migration',
      turn_id: 'turn-migration',
      context: {
        context_id: 'ctx-migration',
        cache_id: 'cache-migration',
        context_hash: 'hash-migration',
        source_manifest_hash: 'manifest-migration',
        context_profile: 'T-ctx',
        tool_contract_hash: 'tools-migration',
        persisted: true,
      },
      eligible_target: {
        authorized: true,
        actor_id: 'migration-agent',
        workspace_id: 'workspace-migration',
        project_id: 'project-migration',
        provider_id: 'codex',
        entitlement_id: 'ent-migration',
        executor_class: 'external-agent',
        model_id: 'model-migration',
        state: 'active',
        compatibility: proof,
      },
      policy_decision_refs: ['policy:entitlement:migration', COMPAT_POLICY_REF],
    });
    const compatibilityRegistry = createProviderCompatibilityRegistry([migrationCompatibilityRecord()]);
    const registry = createExecutorRegistry({ codex: { execute: async () => ({ ok: true }) } }, {
      bindingService,
      compatibilityRegistry,
    });
    const request = { ...governedRequest(), executionBinding: issued };
    expect(registry.inspect()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'claude-code', available: false })]));
    await expect(registry.execute('claude-code', {})).rejects.toBeInstanceOf(ProviderUnavailableError);
    expect(request.executionBinding).toMatchObject({
      schema: 'govibe-execution-binding/v1',
      actor_id: 'migration-agent',
      principal_id: 'migration-agent',
      workspace_id: 'workspace-migration',
      task_id: 'TASK-migration',
      agent_id: 'migration-agent',
      run_id: 'run-migration',
      session_id: 'session-migration',
      turn_id: 'turn-migration',
      context_id: 'ctx-migration',
      cache_id: 'cache-migration',
    });
    await expect(registry.execute('codex', request)).resolves.toEqual({ ok: true });
  });

  it('shares skill definitions while separating CoVibe and CoDev authority', () => {
    const covibe = createPolicyEnvelope('covibe', 'boss');
    const codev = createPolicyEnvelope('codev', 'agent');
    expect(covibe.skillRegistry).toBe(codev.skillRegistry);
    expect(() => assertPolicyAllows(codev, 'archive_rwang')).toThrow(/denied/i);
    expect(() => assertPolicyAllows(covibe, 'private_workflow')).not.toThrow();
  });
});

describe('governance operations', () => {
  it('publishes every migration command in the MCP catalog', () => {
    const names = new Set(toolCatalog.map((tool) => tool.name));
    for (const name of ['govibe.workspace.scan', 'govibe.plan.create', 'govibe.workflow.continue', 'govibe.workflow.status', 'govibe.workspace.impact', 'govibe.docs.version', 'govibe.review.run', 'govibe.optimize.run', 'govibe.workspace.initialize']) expect(names.has(name)).toBe(true);
  });
  it('keeps reversible legacy aliases with deprecation metadata', () => {
    expect(resolveToolName('RWANG:scan')).toBe('govibe.workspace.scan');
    expect(resolveToolName('GoVibe:init')).toBe('govibe.workspace.initialize');
    expect(legacyAliasCatalog.every((alias) => alias.deprecated)).toBe(true);
  });
  it('keeps review read-only, reports impact, versions docs, and measures optimize', async () => {
    const workspacePath = await root();
    await writeFile(path.join(workspacePath, 'README.md'), '# demo\n');
    await writeFile(path.join(workspacePath, 'VERSIONED.md'), '---\nversion: "1.2.3"\n---\n');
    const before = await readFile(path.join(workspacePath, 'README.md'), 'utf8');
    expect((await reviewWorkspace({ workspacePath })).mode).toBe('read_only');
    expect(await readFile(path.join(workspacePath, 'README.md'), 'utf8')).toBe(before);
    expect((await workspaceImpact({ workspacePath, paths: ['README.md'] })).references).toEqual([]);
    expect((await docsVersion({ workspacePath, path: 'VERSIONED.md' })).version).toBe('1.2.3');
    await expect(optimizeMeasured({ measureBefore: async () => 10, optimize: async () => undefined, measureAfter: async () => 8 })).resolves.toMatchObject({ before: 10, after: 8, delta: -2 });
  });
});
