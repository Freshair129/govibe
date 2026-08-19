import { useConnectionStatus } from "../hooks/useConnectionStatus";

// TASK-PRD-021 (AUD-24): every honest empty-state view in Mission Control renders through this
// component, so it is the lowest-churn place to make an empty feed distinguishable from a
// dropped connection -- panels do not need their own wiring, they get it by using EmptyState.
function connectionStatusNote(connectionState: ReturnType<typeof useConnectionStatus>["connectionState"], isStale: boolean): string | null {
  if (connectionState === "unauthorized") {
    return "Unauthorized: the mission sidecar rejected the last bootstrap request (401). Sign in or configure the mission token, then reload.";
  }
  if (isStale) {
    return "Transport disconnected: this reflects the last snapshot received, not a live feed.";
  }
  if (connectionState !== "connected") {
    return "Not connected: no live snapshot has been received yet.";
  }
  return null;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { connectionState, isStale } = useConnectionStatus();
  const statusNote = connectionStatusNote(connectionState, isStale);

  return (
    <section className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
      {statusNote ? <p className="empty-state-status">{statusNote}</p> : null}
    </section>
  );
}
