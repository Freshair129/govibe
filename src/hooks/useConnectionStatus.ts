import { useEffect, useState } from "react";
import type { ConnectionState } from "../mission";
import { missionGateway } from "../mission";

// TASK-PRD-021 (AUD-24): a WS drop previously left every panel showing the last snapshot with
// only a global StatusBar hint -- an empty feed and a dropped connection rendered identically.
// This hook is the shared surface panels (via EmptyState) and the status wrapper (StatusBar)
// both read from, so a panel can tell "healthy connection, genuinely empty feed" apart from
// "lost connection, showing whatever we last received" without every one of the 21 views
// wiring up its own connection-state plumbing.
export type ConnectionStatus = {
  connectionState: ConnectionState;
  /** ISO timestamp of the most recent snapshot patch, if any has ever been received. */
  lastUpdated?: string;
  /**
   * True when we have previously received live snapshot content (lastUpdated is set) but the
   * transport is not currently connected -- i.e. any data on screen is last-known, not live.
   */
  isStale: boolean;
};

export function useConnectionStatus(): ConnectionStatus {
  const [snapshot, setSnapshot] = useState(() => missionGateway.getSnapshot());

  useEffect(() => missionGateway.subscribe(setSnapshot), []);

  return {
    connectionState: snapshot.connectionState,
    lastUpdated: snapshot.updatedAt,
    isStale: snapshot.connectionState !== "connected" && Boolean(snapshot.updatedAt),
  };
}
