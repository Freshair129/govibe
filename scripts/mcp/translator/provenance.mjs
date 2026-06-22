// Translator-core slice — provenance writer (FR-6, local jsonl interim -> MSP later).
// Append-only .jsonl. Fields are MSP-shaped so the future migration is a mechanical adapter.
// Injectable writer keeps it unit-testable without touching disk.

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const defaultDir = path.join(workspaceRoot, ".agents", "devops", "translator-provenance");

/** Build an MSP-shaped provenance record. `now` is injectable for deterministic tests. */
export function buildRecord({ kind, auditRef, actor, sourceCommit = null, atomsRef = null, citedAtoms = [], templateRef = null, fidelity = null, startedAt, endedAt }) {
  return {
    kind,                 // "ingest" | "render"
    auditRef,
    actor: actor ?? null,
    sourceCommit,
    atomsRef,
    citedAtoms,
    templateRef,
    fidelity: fidelity ? { verdict: fidelity.verdict, score: fidelity.semantic?.score ?? null } : null,
    startedAt: startedAt ?? null,
    endedAt: endedAt ?? null,
  };
}

/**
 * Append a record. Pass options.writer to capture without disk (tests).
 * Default: append a JSON line under .agents/devops/translator-provenance/<date>.jsonl.
 */
export function appendRecord(record, { writer = null, dir = defaultDir, dateKey } = {}) {
  if (writer) {
    writer(record);
    return record;
  }
  mkdirSync(dir, { recursive: true });
  const day = dateKey ?? new Date().toISOString().slice(0, 10);
  appendFileSync(path.join(dir, `${day}.jsonl`), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
