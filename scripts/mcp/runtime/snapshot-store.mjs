export function createRuntimeSnapshot(capabilities = []) {
  return {
    connectionState: "connected", updatedAt: new Date().toISOString(), metrics: [], chart: { labels: [], series: [] }, reactor: [],
    agents: [], capabilities, terminal: [], graph: { nodes: [], edges: [] }, specs: [], symbols: [], campaignLogs: [],
    orchestration: { waves: [], updatedAt: new Date().toISOString() }, workflowRuns: [], providers: [], sessions: [],
    // WP-17 Bounded Scope item 3: the memory slice, always a real object
    // (never undefined), matching every other array-typed field's
    // empty-value convention.
    memory: { results: [], selectedEntityId: null, lastQuery: null, lastSearchedAt: null, lastDecayResult: null },
  };
}

export class RuntimeSnapshotStore {
  #snapshot;
  #listeners = new Set();
  constructor(initialSnapshot) { this.#snapshot = initialSnapshot; }
  getSnapshot() { return this.#snapshot; }
  replace(snapshot) { this.#snapshot = snapshot; return snapshot; }
  patch(patch) { return this.replace({ ...this.#snapshot, ...patch, updatedAt: patch.updatedAt ?? new Date().toISOString() }); }
  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit(event) { for (const listener of this.#listeners) listener(event); }
  appendTerminal(type, text) {
    const line = { id: crypto.randomUUID(), type, text, time: new Date().toLocaleTimeString("en-US", { hour12: false }) };
    this.patch({ terminal: [...this.#snapshot.terminal.slice(-199), line] });
    this.emit({ type: "terminal.line", line });
    return line;
  }
}
