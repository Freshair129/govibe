import { useState, type FormEvent } from "react";
import type { MissionCommand, MissionSnapshot } from "../mission";

export function Terminal({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!command.trim()) return;
    void send({ type: "terminal.command", command });
    setCommand("");
  };

  return (
    <>
      <button className="terminal-fab" onClick={() => setOpen((value) => !value)}>$_</button>
      <section className={open ? "terminal open" : "terminal"}>
        <header><strong>mission-transport</strong><button onClick={() => setOpen(false)}>x</button></header>
        <div className="terminal-output">
          {snapshot.terminal.length ? snapshot.terminal.map((line) => (
            <div key={line.id}><span>[{line.time}]</span> <strong>{line.type}</strong> {line.text}</div>
          )) : <div className="muted">No terminal events yet.</div>}
        </div>
        <form onSubmit={submit}>
          <span>$</span>
          <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Send command to mission transport..." />
          <button type="submit">Send</button>
        </form>
      </section>
    </>
  );
}
