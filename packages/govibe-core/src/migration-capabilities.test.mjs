import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createWorkflowPlan, getWorkflowStatus, transitionWorkflow } from './workflow-engine.mjs';
import { createExecutorRegistry, ProviderUnavailableError } from './executor-adapter.mjs';
import { createPolicyEnvelope, assertPolicyAllows } from './policy-envelope.mjs';
import { reviewWorkspace, optimizeMeasured, workspaceImpact, docsVersion } from './governance-operations.mjs';
import { legacyAliasCatalog, resolveToolName, toolCatalog } from '../../../scripts/mcp/registry.mjs';

const roots = [];
async function root() { const value = await mkdtemp(path.join(os.tmpdir(), 'govibe-migration-')); roots.push(value); return value; }
afterEach(async () => Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))));

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
    executionBinding: { binding_id: 'binding-migration', provider_id: 'codex', entitlement_id: 'entitlement-migration', principal_id: 'migration-agent', run_id: 'run-migration', credential_grant_id: null, provider_session_id: null },
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
    const registry = createExecutorRegistry({ codex: { execute: async () => ({ ok: true }) } });
    expect(registry.inspect()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'claude-code', available: false })]));
    await expect(registry.execute('claude-code', {})).rejects.toBeInstanceOf(ProviderUnavailableError);
    await expect(registry.execute('codex', governedRequest())).resolves.toEqual({ ok: true });
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
