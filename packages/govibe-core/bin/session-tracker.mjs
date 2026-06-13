import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
    const event = { type, timestamp: Date.now(), ...data };
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
