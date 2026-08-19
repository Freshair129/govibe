import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TemporalOverlayStore } from "./temporal-overlay-store.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
async function journalDir() {
  const value = await mkdtemp(path.join(os.tmpdir(), "govibe-overlay-store-"));
  roots.push(value);
  return value;
}

describe("temporal overlay store", () => {
  it("supersedes prior records and returns the latest visible value", () => {
    const store = new TemporalOverlayStore();
    store.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    store.record("nodes", "task-1", { id: "task-1", version: "1.1.0", recordedAt: "2026-02-01T00:00:00Z" });
    expect(store.getHistory("nodes", "task-1")[0].supersededAt).toBe("2026-02-01T00:00:00Z");
    expect(store.active("nodes", (node) => node.id)).toMatchObject([{ version: "1.1.0" }]);
  });

  it("without a journalPath stays purely in-memory (no fs footprint, load() is a no-op)", async () => {
    const store = new TemporalOverlayStore();
    store.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    await expect(store.flush()).resolves.toBeUndefined();
    await expect(store.load()).resolves.toEqual({ loaded: 0, skipped: 0 });
  });
});

// TASK-PRD-031 (AUD-11): the durable journal — append-per-mutation, replay-on-boot, and
// tolerant of a corrupt/truncated trailing line.
describe("temporal overlay store — durable journal (TASK-PRD-031)", () => {
  it("appends one JSON line per record() call and replays them into a fresh store", async () => {
    const dir = await journalDir();
    const journalPath = path.join(dir, "roadmap-overlay.jsonl");

    const writer = new TemporalOverlayStore({ journalPath });
    writer.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    writer.record("assignments", "task-1", { taskId: "task-1", subjectId: "agent-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:01Z" });
    await writer.flush();

    const raw = await readFile(journalPath, "utf8");
    const lines = raw.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toMatchObject({ kind: "nodes", key: "task-1" });

    const reader = new TemporalOverlayStore({ journalPath });
    const result = await reader.load();
    expect(result).toEqual({ loaded: 2, skipped: 0 });
    expect(reader.active("nodes", (node) => node.id)).toMatchObject([{ id: "task-1", version: "1.0.0" }]);
    expect(reader.active("assignments", (item) => item.taskId)).toMatchObject([{ subjectId: "agent-1" }]);
  });

  it("preserves supersession order across a replay (later record wins)", async () => {
    const dir = await journalDir();
    const journalPath = path.join(dir, "roadmap-overlay.jsonl");

    const writer = new TemporalOverlayStore({ journalPath });
    writer.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    writer.record("nodes", "task-1", { id: "task-1", version: "1.1.0", recordedAt: "2026-02-01T00:00:00Z" });
    await writer.flush();

    const reader = new TemporalOverlayStore({ journalPath });
    await reader.load();
    expect(reader.getHistory("nodes", "task-1")[0].supersededAt).toBe("2026-02-01T00:00:00Z");
    expect(reader.active("nodes", (node) => node.id)).toMatchObject([{ version: "1.1.0" }]);
  });

  it("treats a missing journal file as zero records, not an error", async () => {
    const dir = await journalDir();
    const journalPath = path.join(dir, "does-not-exist.jsonl");
    const store = new TemporalOverlayStore({ journalPath });
    await expect(store.load()).resolves.toEqual({ loaded: 0, skipped: 0 });
  });

  it("skips a corrupt/truncated trailing line instead of throwing, and still loads the valid lines before it", async () => {
    const dir = await journalDir();
    const journalPath = path.join(dir, "roadmap-overlay.jsonl");
    const goodLine = `${JSON.stringify({ kind: "nodes", key: "task-1", value: { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" } })}\n`;
    const truncatedLine = '{"kind":"nodes","key":"task-2","value":{"id":"task-2","versio';
    await writeFile(journalPath, goodLine + truncatedLine, "utf8");

    const store = new TemporalOverlayStore({ journalPath });
    const result = await store.load();
    expect(result).toEqual({ loaded: 1, skipped: 1 });
    expect(store.active("nodes", (node) => node.id)).toMatchObject([{ id: "task-1" }]);
  });

  it("does not crash on a well-formed line with an unknown kind or malformed shape", async () => {
    const dir = await journalDir();
    const journalPath = path.join(dir, "roadmap-overlay.jsonl");
    await writeFile(
      journalPath,
      `${JSON.stringify({ kind: "not-a-real-kind", key: "x", value: {} })}\n${JSON.stringify({ kind: "nodes" })}\n`,
      "utf8",
    );
    const store = new TemporalOverlayStore({ journalPath });
    const result = await store.load();
    expect(result).toEqual({ loaded: 0, skipped: 2 });
  });

  it("rejects an unknown overlay kind passed to record()", () => {
    const store = new TemporalOverlayStore();
    expect(() => store.record("not-a-real-kind", "x", {})).toThrow(/Unknown temporal overlay kind/);
  });

  // Review-gate finding 031-A: a failed durable write used to leave the in-memory record
  // applied anyway — memory could claim a mutation existed that was never actually
  // persisted. record() now rolls back the in-memory application when its journal append
  // fails, so memory never diverges ahead of disk.
  it("rolls back the in-memory record when the journal append fails, and flush() surfaces the rejection", async () => {
    const dir = await journalDir();
    const blockedPath = path.join(dir, "blocked");
    await writeFile(blockedPath, "occupies the path a directory would need", "utf8");
    const journalPath = path.join(blockedPath, "roadmap-overlay.jsonl"); // mkdir(blockedPath) will fail: it's a file

    const store = new TemporalOverlayStore({ journalPath });
    store.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    // Applied optimistically in memory before the durable write is known to have failed.
    expect(store.getHistory("nodes", "task-1")).toHaveLength(1);

    await expect(store.flush()).rejects.toThrow();
    expect(store.getHistory("nodes", "task-1")).toHaveLength(0); // rolled back
    expect(store.active("nodes", (node) => node.id)).toEqual([]);
  });

  it("undoes the supersededAt stamp on the prior record when a superseding record's journal append fails", async () => {
    const dir = await journalDir();
    const journalPath = path.join(dir, "roadmap-overlay.jsonl");
    const store = new TemporalOverlayStore({ journalPath });

    store.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    await store.flush(); // first write succeeds and lands on disk

    await rm(dir, { recursive: true, force: true }); // journal's directory is now gone

    store.record("nodes", "task-1", { id: "task-1", version: "1.1.0", recordedAt: "2026-02-01T00:00:00Z" });
    await expect(store.flush()).rejects.toThrow();

    const history = store.getHistory("nodes", "task-1");
    expect(history).toHaveLength(1);
    expect(history[0].version).toBe("1.0.0");
    expect(history[0].supersededAt).toBeUndefined(); // the stamp record() applied was undone too
    expect(store.active("nodes", (node) => node.id)).toMatchObject([{ version: "1.0.0" }]);
  });
});
