import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { redactSensitiveFields } from "../src/log-redaction.mjs";

export class SessionTracker {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.sessionId = crypto.randomUUID();
    this.startTime = Date.now();
    this.logsPath = path.join(rootDir, ".agents/devops/session_logs", `${this.sessionId}.jsonl`);
    this.events = [];
    this.init();
  }

  async init() {
    await fs.mkdir(path.dirname(this.logsPath), { recursive: true });
    await fs.writeFile(this.logsPath, JSON.stringify({ type: "session_start", sessionId: this.sessionId, startTime: this.startTime }) + "\n");
  }

  async logEvent(type, data) {
    // TASK-PRD-028 (AUD-10c): this is the single durable sink every logEvent caller writes
    // through (e.g. runtime-core.mjs's "agent_run" event, which persists full tool call
    // args) — redacting here, once, covers every current and future caller instead of
    // requiring each call site to remember to sanitize its own payload.
    const event = { type, timestamp: Date.now(), ...redactSensitiveFields(data) };
    this.events.push(event);
    await fs.appendFile(this.logsPath, JSON.stringify(event) + "\n");
  }

  async generateSummary() {
    const duration = Date.now() - this.startTime;
    const summary = {
      type: "session_summary",
      sessionId: this.sessionId,
      durationMs: duration,
      eventCount: this.events.length,
      // Aggregation could be added here
    };
    await fs.appendFile(this.logsPath, JSON.stringify(summary) + "\n");
    return summary;
  }
}
