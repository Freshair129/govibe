import { describe, expect, it } from "vitest";

import { createMspClientFromEnvironment, inspectMspConfiguration, MspConfigurationError, MspUnavailableError } from "./msp-client.mjs";

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
});
