import { isRecord } from "../../../packages/mission-protocol/index.js";

export class MissionHttpTransport {
  constructor(private readonly baseUrl: string, private readonly fetchImpl: typeof fetch = fetch, private readonly timeoutMs = 10_000) {}
  async request(pathname: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try { return await this.fetchImpl(`${this.baseUrl.replace(/\/$/, "")}${pathname}`, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timeoutId); }
  }
  async readJson(response: Response): Promise<Record<string, unknown> | undefined> {
    try { const payload: unknown = await response.json(); return isRecord(payload) ? payload : undefined; }
    catch { return undefined; }
  }
}
