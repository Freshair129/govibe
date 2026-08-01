import type { MissionEvent, MissionSnapshot } from "./domain";
import { emptyMissionSnapshot, mergeMissionSnapshot, reduceMissionEvent } from "./snapshot-reducer";

export class MissionSnapshotStore {
  private snapshot: MissionSnapshot;
  private readonly listeners = new Set<(snapshot: MissionSnapshot) => void>();

  constructor(initial: MissionSnapshot = emptyMissionSnapshot) { this.snapshot = initial; }
  getSnapshot(): MissionSnapshot { return this.snapshot; }
  subscribe(listener: (snapshot: MissionSnapshot) => void): () => void { this.listeners.add(listener); listener(this.snapshot); return () => this.listeners.delete(listener); }
  patch(value: Partial<MissionSnapshot>): void { this.publish(mergeMissionSnapshot(this.snapshot, value)); }
  apply(event: MissionEvent): void { this.publish(reduceMissionEvent(this.snapshot, event)); }
  clear(): void { this.listeners.clear(); }
  private publish(snapshot: MissionSnapshot): void { this.snapshot = snapshot; this.listeners.forEach((listener) => listener(snapshot)); }
}
