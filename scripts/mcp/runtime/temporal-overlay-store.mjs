import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isTemporalVisible } from "../temporal-versioning.mjs";

export function latestTemporalByKey(records, keySelector, options = {}) {
  const selected = new Map();
  for (const record of records.filter((item) => isTemporalVisible(item, options))) {
    const key = keySelector(record);
    const existing = selected.get(key);
    if (!existing || Date.parse(record.recordedAt ?? "") >= Date.parse(existing.recordedAt ?? "")) selected.set(key, record);
  }
  return Array.from(selected.values());
}

const OVERLAY_KINDS = ["nodes", "assignments", "handoffs", "verifications"];

// TASK-PRD-031 (AUD-11): every runtime roadmap mutation (state changes, assignments,
// verifications, canvas approvals) lived only in these in-memory Maps and evaporated on
// MCP server restart, while the RBAC audit trail (.govibe/rbac-audit.jsonl) survived — so
// audit referents dangled after any restart. `journalPath`, when provided, makes every
// `record()` call durable via an append-only JSONL journal (same convention as
// .govibe/rbac-audit.jsonl); `load()` replays it back into memory on boot.
//
// Review-gate finding 031-C — scope of "durable" here: each append is one `fs.appendFile`
// call, serialized against concurrent writes by #writeQueue, and its promise is awaited by
// flush() before a caller acknowledges the mutation. That is restart durability (survives the
// MCP process exiting and a new one starting against the same file) and ordinary
// process-crash durability for writes the OS has already flushed to its own buffers by the
// time appendFile's callback resolves. It is NOT fsync/fdatasync durability — an OS-level or
// hardware-level crash between the write syscall returning and the kernel's page cache
// actually reaching disk can still lose the most recent append. That stronger guarantee was
// not requested by this task and is not implemented.
//
// Without `journalPath` the store behaves exactly as before — in-memory only. This is the
// default for the bare `GovibeRuntime`/`TemporalOverlayStore` constructors so unit tests
// (and any caller that wants a scratch overlay) get zero disk footprint; only the exported
// runtime singleton opts in to a real journal path.
export class TemporalOverlayStore {
  #history = { nodes: new Map(), assignments: new Map(), handoffs: new Map(), verifications: new Map() };
  #journalPath;
  #dirEnsured = false;
  #writeQueue = Promise.resolve();
  #lastWrite;

  constructor({ journalPath } = {}) {
    this.#journalPath = journalPath || undefined;
  }

  getHistory(kind, key) { return [...(this.#history[kind]?.get(key) ?? [])]; }

  #applyInMemory(kind, key, value) {
    const history = this.getHistory(kind, key);
    this.#history[kind].set(key, [
      ...history.map((record) => record.supersededAt ? record : { ...record, supersededAt: value.recordedAt }),
      value,
    ]);
    return value;
  }

  async #appendJournal(kind, key, value) {
    if (!this.#dirEnsured) {
      await mkdir(path.dirname(this.#journalPath), { recursive: true });
      this.#dirEnsured = true;
    }
    // One JSON object per line, one fs.appendFile call per mutation — the write is either
    // fully applied or not (no interleaving with concurrent appends, since #writeQueue
    // serializes them below).
    await appendFile(this.#journalPath, `${JSON.stringify({ kind, key, value })}\n`, "utf8");
  }

  record(kind, key, value) {
    if (!OVERLAY_KINDS.includes(kind)) throw new Error(`Unknown temporal overlay kind: ${kind}`);
    const previousHistory = this.getHistory(kind, key);
    this.#applyInMemory(kind, key, value);
    if (this.#journalPath) {
      const write = this.#writeQueue
        .then(() => this.#appendJournal(kind, key, value))
        .catch((error) => {
          // Review-gate finding 031-A: the durable write failed — memory must never claim a
          // mutation exists that was never actually persisted. Undo the in-memory application,
          // including the supersededAt stamp it applied to the prior record, restoring the
          // history array exactly as it was before this record() call — but only if nothing
          // newer has been recorded for this key in the meantime (an interleaved later
          // record()'s state must never be clobbered by an earlier one's failed-write rollback;
          // in that case we leave memory as-is and just let the rejection surface via flush()).
          const current = this.getHistory(kind, key);
          if (current.at(-1) === value) {
            this.#history[kind].set(key, previousHistory);
          }
          throw error;
        });
      this.#lastWrite = write;
      // Keep the queue alive after a failed append so later mutations can still be
      // journaled; flush() below still surfaces this specific write's rejection.
      this.#writeQueue = write.catch(() => {});
    }
    return value;
  }

  // Callers that must not acknowledge a mutation until it is durably on disk (e.g.
  // RoadmapService, before replying to an MCP tool call) await this after record().
  // No-op when no journalPath is configured.
  async flush() {
    if (this.#lastWrite) await this.#lastWrite;
  }

  // Replays the durable journal into memory. Call once at boot, before the overlay is
  // read for the first time (e.g. before RoadmapService#reloadRoadmap). A missing journal
  // is not an error — a fresh workspace has none yet. A corrupt or truncated trailing line
  // (e.g. a crash mid-append) is skipped rather than thrown — boot must not fail on a
  // partial last line — and the skip count is returned so the caller can log one bounded
  // warning instead of one line per bad record.
  async load() {
    if (!this.#journalPath) return { loaded: 0, skipped: 0 };
    let raw;
    try {
      raw = await readFile(this.#journalPath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return { loaded: 0, skipped: 0 };
      throw error;
    }
    let loaded = 0;
    let skipped = 0;
    for (const line of raw.split(/\r?\n/)) {
      if (line.trim().length === 0) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        skipped += 1;
        continue;
      }
      if (!entry || typeof entry !== "object" || !OVERLAY_KINDS.includes(entry.kind) || entry.key === undefined || entry.key === null || !entry.value || typeof entry.value !== "object") {
        skipped += 1;
        continue;
      }
      this.#applyInMemory(entry.kind, entry.key, entry.value);
      loaded += 1;
    }
    return { loaded, skipped };
  }

  active(kind, keySelector, options = {}) {
    return latestTemporalByKey(Array.from(this.#history[kind].values()).flat(), keySelector, options);
  }
}
