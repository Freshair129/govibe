import { useState, type FormEvent } from "react";
import { ViewHeader } from "../../shared/ViewHeader";

export function DataIngestView({ ingest }: { ingest: (json: string) => void }) {
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("Paste a MissionEvent JSON payload and ingest it into the live gateway.");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      ingest(payload);
      setMessage("Payload ingested.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid payload.");
    }
  };

  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Debugger" title="SRS-G Debugger" desc="Manual JSON ingress for real MissionEvent payloads." />
      <form className="panel ingest-panel" onSubmit={submit}>
        <label htmlFor="mission-event-json">MissionEvent JSON</label>
        <textarea
          id="mission-event-json"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          spellCheck={false}
        />
        <div className="ingest-actions">
          <span>{message}</span>
          <button type="submit">Ingest</button>
        </div>
      </form>
    </div>
  );
}
