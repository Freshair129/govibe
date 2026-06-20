export function StatusBar({ connectionLabel, updatedAt }: { connectionLabel: string; updatedAt?: string }) {
  return (
    <div className="status-row">
      <span>{connectionLabel}</span>
      <span>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : "No live snapshot received"}</span>
    </div>
  );
}
