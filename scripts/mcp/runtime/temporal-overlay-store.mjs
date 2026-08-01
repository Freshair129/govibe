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

export class TemporalOverlayStore {
  #history = { nodes: new Map(), assignments: new Map(), handoffs: new Map(), verifications: new Map() };
  getHistory(kind, key) { return [...(this.#history[kind]?.get(key) ?? [])]; }
  record(kind, key, value) {
    const history = this.getHistory(kind, key);
    this.#history[kind].set(key, [
      ...history.map((record) => record.supersededAt ? record : { ...record, supersededAt: value.recordedAt }),
      value,
    ]);
    return value;
  }
  active(kind, keySelector, options = {}) {
    return latestTemporalByKey(Array.from(this.#history[kind].values()).flat(), keySelector, options);
  }
}
