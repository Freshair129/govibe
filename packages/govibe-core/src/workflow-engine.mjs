import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const TASK_STATUSES = new Set(['pending', 'running', 'paused', 'complete', 'failed', 'blocked']);

function validateId(value, label) {
  if (!ID.test(value ?? '') || value.includes('..')) throw new Error(`Invalid ${label}: ${value}`);
}

function validateDag(tasks) {
  const ids = new Set(tasks.map((task) => task.id));
  if (ids.size !== tasks.length) throw new Error('Workflow task IDs must be unique.');
  for (const task of tasks) for (const dependency of task.dependsOn ?? []) if (!ids.has(dependency)) throw new Error(`Unknown dependency: ${dependency}`);
  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(tasks.map((task) => [task.id, task]));
  function visit(id) {
    if (visiting.has(id)) throw new Error('Workflow DAG contains a cycle.');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).dependsOn ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
}

function runDirectory(workspacePath, runId) {
  validateId(runId, 'run ID');
  return path.join(path.resolve(workspacePath), 'state', 'runs', runId);
}

async function writeSnapshot(directory, snapshot) {
  const temporary = path.join(directory, `.snapshot-${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, path.join(directory, 'snapshot.json'));
}

async function appendEvent(directory, event) {
  await appendFile(path.join(directory, 'events.jsonl'), `${JSON.stringify(event)}\n`, { encoding: 'utf8' });
}

function publicSnapshot(snapshot) {
  const currentTask = snapshot.tasks.find((task) => task.status !== 'complete')?.id ?? null;
  const status = snapshot.tasks.every((task) => task.status === 'complete') ? 'completed' : snapshot.tasks.some((task) => task.status === 'failed') ? 'failed' : snapshot.tasks.some((task) => task.status === 'paused') ? 'paused' : 'active';
  return { ...snapshot, currentTask, status };
}

export async function createWorkflowPlan({ workspacePath, runId = randomUUID(), tasks, skillLock = [], sourceSnapshotHash = null, policyEnvelope = null }) {
  validateId(runId, 'run ID');
  if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('Workflow tasks are required.');
  const normalized = tasks.map((task) => {
    validateId(task.id, 'task ID');
    return { id: task.id, dependsOn: [...(task.dependsOn ?? [])], status: 'pending', attempts: 0, outputRefs: [] };
  });
  validateDag(normalized);
  const directory = runDirectory(workspacePath, runId);
  await mkdir(directory, { recursive: true });
  const createdAt = new Date().toISOString();
  const snapshot = { schema: 'govibe-run-snapshot/v1', runId, skillLock, sourceSnapshotHash, policyEnvelope, tasks: normalized, createdAt, updatedAt: createdAt };
  await writeFile(path.join(directory, 'plan.json'), `${JSON.stringify({ schema: 'govibe-plan/v1', runId, tasks: normalized.map(({ id, dependsOn }) => ({ id, dependsOn })) }, null, 2)}\n`, { flag: 'wx' });
  const event = { schema: 'govibe-workflow-event/v1', eventId: randomUUID(), type: 'workflow.created', runId, timestamp: createdAt };
  await appendEvent(directory, event);
  await writeSnapshot(directory, snapshot);
  return publicSnapshot(snapshot);
}

export async function getWorkflowStatus({ workspacePath, runId }) {
  return publicSnapshot(JSON.parse(await readFile(path.join(runDirectory(workspacePath, runId), 'snapshot.json'), 'utf8')));
}

export async function transitionWorkflow({ workspacePath, runId, taskId, status, idempotencyKey = randomUUID(), verification, outputRefs = [] }) {
  validateId(taskId, 'task ID');
  if (!TASK_STATUSES.has(status)) throw new Error(`Invalid workflow status: ${status}`);
  const directory = runDirectory(workspacePath, runId);
  const eventsPath = path.join(directory, 'events.jsonl');
  const priorEvents = (await readFile(eventsPath, 'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const replay = priorEvents.find((event) => event.idempotencyKey === idempotencyKey);
  if (replay) return replay;
  const snapshot = JSON.parse(await readFile(path.join(directory, 'snapshot.json'), 'utf8'));
  const task = snapshot.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown workflow task: ${taskId}`);
  if (status === 'running' && task.dependsOn.some((dependency) => snapshot.tasks.find((item) => item.id === dependency)?.status !== 'complete')) throw new Error('Workflow dependency is not complete.');
  // TASK-PRD-030 (AUD-06): a caller-supplied { passed: true } used to be sufficient to complete a
  // task — no evidence check. The minimal honest contract now in place: completion requires at
  // least one evidenceRefs entry, and every entry must resolve against a declared outputRef —
  // this transition's `outputRefs` argument, or (because task.outputRefs persists across calls)
  // a prior transition's on the same task. Review-gate finding 030-C: be honest about what this
  // buys — the SAME caller controls both `outputRefs` and `verification.evidenceRefs`, so this is
  // internal-consistency checking (the caller must declare the same ref twice, in two different
  // arguments), not independent verification of the evidence. It closes the literal
  // caller-asserts-{passed:true}-with-nothing-else gap; it does not prove the referenced artifact
  // actually exists. Cross-transition-only resolution or filesystem-backed evidence (does the
  // referenced path/artifact actually exist on disk) remain follow-up work, not done here.
  if (status === 'complete') {
    if (verification?.passed !== true) throw new Error('Workflow completion requires passing verification.');
    const evidenceRefs = Array.isArray(verification.evidenceRefs)
      ? verification.evidenceRefs.filter((ref) => typeof ref === 'string' && ref.trim().length > 0)
      : [];
    if (evidenceRefs.length === 0) throw new Error('Workflow completion requires at least one resolvable verification.evidenceRefs entry.');
    const knownOutputRefs = new Set([...outputRefs, ...(task.outputRefs ?? [])]);
    const unresolved = evidenceRefs.filter((ref) => !knownOutputRefs.has(ref));
    if (unresolved.length > 0) throw new Error(`Workflow completion evidenceRefs do not resolve to a recorded outputRef: ${unresolved.join(', ')}`);
  }
  task.status = status;
  task.attempts += status === 'running' ? 1 : 0;
  task.outputRefs = [...outputRefs];
  snapshot.updatedAt = new Date().toISOString();
  const event = { schema: 'govibe-workflow-event/v1', eventId: randomUUID(), idempotencyKey, type: 'workflow.transition', runId, taskId, status, outputRefs, timestamp: snapshot.updatedAt };
  await appendEvent(directory, event);
  await writeSnapshot(directory, snapshot);
  return event;
}
