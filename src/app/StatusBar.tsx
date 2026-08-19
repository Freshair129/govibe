import { useConnectionStatus } from "../hooks/useConnectionStatus";

// TASK-PRD-021 (AUD-24): StatusBar renders directly above every view's content (see App.tsx),
// so it is the one place that can give EVERY panel the "lost connection, showing last-known
// data" distinction without editing all 21 views individually -- a panel with real content on
// screen isn't itself empty, so EmptyState's per-slice status note (src/shared/EmptyState.tsx)
// can't cover that case; this banner is what does.
function connectionLabel(connectionState: ReturnType<typeof useConnectionStatus>["connectionState"]): string {
  return connectionState.toUpperCase();
}

export function StatusBar() {
  const { connectionState, lastUpdated, isStale } = useConnectionStatus();

  const staleNote = connectionState === "unauthorized"
    ? "Unauthorized (401) — sign in or configure the mission token, then reload."
    : isStale
      ? `Showing last-known data from ${new Date(lastUpdated!).toLocaleTimeString()} — connection lost.`
      : null;

  return (
    <div className="status-row">
      <span>{connectionLabel(connectionState)}</span>
      <span>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : "No live snapshot received"}</span>
      {staleNote ? <span className="status-row-stale">{staleNote}</span> : null}
    </div>
  );
}
