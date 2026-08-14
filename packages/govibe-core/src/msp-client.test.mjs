import { describe, expect, it } from "vitest";

import { createMspClientFromEnvironment, inspectMspConfiguration, MspClient, MspConfigurationError, MspUnavailableError } from "./msp-client.mjs";

describe("MSP environment configuration", () => {
  it("reports an absent parent transport as unconfigured and non-dispatchable", async () => {
    expect(inspectMspConfiguration({})).toMatchObject({
      status: "unconfigured",
      dispatchable: false,
      reason: "msp_command_missing",
    });
    await expect(createMspClientFromEnvironment({}).call("msp_vault_status", {})).rejects.toBeInstanceOf(MspUnavailableError);
  });

  it("distinguishes valid transport configuration from a live parent health check", () => {
    expect(inspectMspConfiguration({
      GOVIBE_MSP_COMMAND: "node",
      GOVIBE_MSP_ARGS: '["server.mjs"]',
      GOVIBE_MSP_CWD: "/srv/msp",
    })).toEqual({
      status: "configured",
      command: "node",
      args: ["server.mjs"],
      cwd: "/srv/msp",
      dispatchable: false,
      reason: "msp_parent_not_probed",
    });
  });

  it("rejects malformed transport configuration before any parent process is spawned", () => {
    const env = { GOVIBE_MSP_COMMAND: "node", GOVIBE_MSP_ARGS: "not-json" };
    expect(inspectMspConfiguration(env)).toMatchObject({ status: "invalid", dispatchable: false, reason: "msp_configuration_invalid" });
    expect(() => createMspClientFromEnvironment(env)).toThrow(MspConfigurationError);
  });

  it("normalizes an MSP health response without exposing provider payloads", async () => {
    const response = {
      schema: "govibe-msp-health/v1",
      health_state: "degraded",
      checked_at: "2026-08-14T00:00:00.000Z",
      evidence_ref: "msp:health/health-1",
      reason: "gks_provider_unconfigured",
      components: {
        msp: { state: "ready", reason: null, evidence_ref: "msp:health/msp-1" },
        gks: { state: "blocked", reason: "gks_provider_unconfigured", evidence_ref: "msp:health/gks-1" },
        storage: { state: "ready", reason: null, evidence_ref: "msp:health/storage-1" },
      },
    };
    const client = new MspClient(async (name, input) => {
      expect(name).toBe("msp_health");
      expect(input).toEqual({});
      return response;
    });

    await expect(client.probeHealth()).resolves.toEqual(response);
  });

  it("fails closed when the parent is unavailable or returns malformed health", async () => {
    await expect(new MspClient().probeHealth()).resolves.toMatchObject({
      health_state: "unavailable",
      reason: "msp_parent_unreachable",
    });

    const malformed = new MspClient(async () => ({ schema: "wrong" }));
    await expect(malformed.probeHealth()).resolves.toMatchObject({
      health_state: "unavailable",
      reason: "msp_health_invalid_response",
    });
  });
});
