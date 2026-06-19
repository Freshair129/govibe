import { useState } from "react";
import type { MissionCommand } from "../../mission";
import { ViewHeader } from "../../shared/ViewHeader";

export function ReactorRunTrigger({ send }: { send: (command: MissionCommand) => void }) {
  const [armed, setArmed] = useState(false);

  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Benchmark" title="System Execution Safety and Triggers" desc="D1 sends benchmark run commands through the configured mission transport." />
      <section className="panel safety-run-panel">
        <div>
          <h2>Reactor Execution Safety Run</h2>
          <span className={armed ? "status-pill online" : "status-pill idle"}>{armed ? "command sent" : "ready"}</span>
        </div>
        <div className="safety-progress"><i style={{ width: armed ? "100%" : "0%" }} /></div>
        <button onClick={() => { setArmed(true); void send({ type: "reactor.run", profile: "default" }); }}>Start Safety Campaign Run</button>
      </section>
    </div>
  );
}
