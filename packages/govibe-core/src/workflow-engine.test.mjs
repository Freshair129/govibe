import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createWorkflowPlan, getWorkflowStatus, transitionWorkflow } from './workflow-engine.mjs';

const roots = [];
async function root() {
  const value = await mkdtemp(path.join(os.tmpdir(), 'govibe-workflow-engine-'));
  roots.push(value);
  return value;
}
afterEach(async () => Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))));

// TASK-PRD-030 (AUD-06): transitionWorkflow's completion path used to accept a
// bare caller-supplied `{ passed: true }` with no evidence check
// (workflow-engine.mjs:86). This is the regression guard for that former
// false-success path — if the evidenceRefs requirement is ever removed, the
// first assertion below starts resolving instead of rejecting and this fails.
describe('transitionWorkflow completion — TASK-PRD-030 (AUD-06) evidence contract', () => {
  it('rejects a caller-asserted { passed: true } with no evidenceRefs at all', async () => {
    const workspacePath = await root();
    await createWorkflowPlan({ workspacePath, runId: 'run-1', tasks: [{ id: 'a', dependsOn: [] }] });
    await expect(
      transitionWorkflow({ workspacePath, runId: 'run-1', taskId: 'a', status: 'complete', verification: { passed: true } }),
    ).rejects.toThrow(/evidenceRefs/i);
    expect((await getWorkflowStatus({ workspacePath, runId: 'run-1' })).tasks.find((task) => task.id === 'a').status).not.toBe('complete');
  });

  it('rejects evidenceRefs that do not resolve to any recorded outputRef', async () => {
    const workspacePath = await root();
    await createWorkflowPlan({ workspacePath, runId: 'run-2', tasks: [{ id: 'a', dependsOn: [] }] });
    await expect(
      transitionWorkflow({
        workspacePath,
        runId: 'run-2',
        taskId: 'a',
        status: 'complete',
        verification: { passed: true, evidenceRefs: ['artifact:does-not-exist'] },
        outputRefs: ['artifact:actually-produced'],
      }),
    ).rejects.toThrow(/do not resolve/i);
  });

  it('rejects an evidenceRefs array containing only blank/non-string entries', async () => {
    const workspacePath = await root();
    await createWorkflowPlan({ workspacePath, runId: 'run-3', tasks: [{ id: 'a', dependsOn: [] }] });
    await expect(
      transitionWorkflow({
        workspacePath,
        runId: 'run-3',
        taskId: 'a',
        status: 'complete',
        verification: { passed: true, evidenceRefs: ['', '   ', 42] },
      }),
    ).rejects.toThrow(/evidenceRefs/i);
  });

  it('completes when evidenceRefs resolve to a recorded outputRef on the same transition', async () => {
    const workspacePath = await root();
    await createWorkflowPlan({ workspacePath, runId: 'run-4', tasks: [{ id: 'a', dependsOn: [] }] });
    await transitionWorkflow({
      workspacePath,
      runId: 'run-4',
      taskId: 'a',
      status: 'complete',
      verification: { passed: true, evidenceRefs: ['artifact:report'] },
      outputRefs: ['artifact:report'],
    });
    const status = await getWorkflowStatus({ workspacePath, runId: 'run-4' });
    expect(status.tasks.find((task) => task.id === 'a').status).toBe('complete');
  });
});
