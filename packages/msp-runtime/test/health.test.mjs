import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../src/server.mjs";

const cleanups = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function server(options = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "msp-runtime-health-test-"));
  const instance = createServer({
    dbPath: path.join(directory, "msp.sqlite3"),
    input: new PassThrough(),
    output: new PassThrough(),
    ...options,
  });
  cleanups.push(() => {
    instance.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return instance;
}

async function health(options = {}) {
  return (await server(options).toolRegistry.dispatch("msp_health", {})).structuredContent;
}

describe("msp_health", () => {
  it("reports MSP and private storage readiness while GKS remains policy-blocked", async () => {
    const instance = server();
    const result = (await instance.toolRegistry.dispatch("msp_health", {})).structuredContent;
    const ping = (await instance.toolRegistry.dispatch("msp_ping", {})).structuredContent;

    expect(result).toMatchObject({
      schema: "govibe-msp-health/v1",
      health_state: "degraded",
      reason: "gks_provider_unconfigured",
      components: {
        msp: { state: "ready", reason: null },
        gks: { state: "blocked", reason: "gks_provider_unconfigured" },
        storage: { state: "ready", reason: null },
      },
    });
    expect(result.evidence_ref).toMatch(/^msp:health\//);
    expect(result.components.gks.evidence_ref).toMatch(/^msp:health\//);
    expect(ping).toMatchObject({ ok: true });
    expect(ping.timestamp).toEqual(expect.any(String));
    expect(JSON.stringify(result)).not.toMatch(/GOVIBE_GKS|credential|secret/i);
  });

  it("reports ready only when all injected probes are ready", async () => {
    const ready = async () => ({ state: "ready" });
    const result = await health({ mspProbe: ready, gksProbe: ready, storageProbe: ready });

    expect(result).toMatchObject({
      health_state: "ready",
      reason: null,
      components: {
        msp: { state: "ready" },
        gks: { state: "ready" },
        storage: { state: "ready" },
      },
    });
  });

  it("keeps an unavailable optional GKS capability explicit and degraded", async () => {
    const result = await health({ gksProbe: async () => ({ state: "unavailable", reason: "gks_unavailable" }) });

    expect(result).toMatchObject({
      health_state: "degraded",
      reason: "gks_unavailable",
      components: { gks: { state: "unavailable", reason: "gks_unavailable" } },
    });
  });

  it.each([
    ["MSP", { mspProbe: async () => ({ state: "unavailable", reason: "msp_runtime_unavailable" }) }, "msp_runtime_unavailable"],
    ["storage", { storageProbe: async () => ({ state: "unavailable", reason: "storage_unavailable" }) }, "storage_unavailable"],
  ])("returns unavailable when %s is unavailable", async (_label, options, reason) => {
    const result = await health(options);

    expect(result.health_state).toBe("unavailable");
    expect(result.reason).toBe(reason);
  });

  it("fails closed on a probe timeout", async () => {
    const result = await health({
      healthTimeoutMs: 5,
      gksProbe: () => new Promise(() => {}),
    });

    expect(result).toMatchObject({
      health_state: "unavailable",
      reason: "health_probe_timeout",
      components: { gks: { state: "unavailable", reason: "health_probe_timeout" } },
    });
  });

  it("fails closed on a malformed probe response", async () => {
    const result = await health({ gksProbe: async () => ({ status: "ok", payload: "not-a-health-state" }) });

    expect(result).toMatchObject({
      health_state: "unavailable",
      reason: "malformed_health_probe_response",
      components: { gks: { state: "unavailable", reason: "malformed_health_probe_response", malformed: true } },
    });
  });
});
