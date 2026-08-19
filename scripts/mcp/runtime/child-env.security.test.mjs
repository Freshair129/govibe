// TASK-PRD-028 (AUD-10a): child processes must receive an explicit ALLOWLISTED env, never the
// full parent process.env — server secrets (GOVIBE_MCP_TOKEN, GOVIBE_MSP_*) must never reach a
// spawned agent process or PTY session, even when they are present in the parent's env.
import { describe, expect, it } from "vitest";

import { buildAllowlistedChildEnv, CHILD_ENV_ALLOWLIST } from "./child-env.mjs";

const secretSource = Object.freeze({
  PATH: "/usr/bin:/bin",
  GOVIBE_MCP_TOKEN: "super-secret-sidecar-token",
  GOVIBE_MSP_TOKEN: "super-secret-msp-token",
  GOVIBE_MSP_API_KEY: "super-secret-msp-key",
  GOVIBE_GKS_TOKEN: "super-secret-gks-token",
  AWS_SECRET_ACCESS_KEY: "super-secret-aws-key",
  DATABASE_URL: "postgres://user:pw@host/db",
  HOME: "/home/dev",
});

describe("buildAllowlistedChildEnv", () => {
  it("never returns process.env itself or every one of its keys", () => {
    const env = buildAllowlistedChildEnv({}, { source: secretSource });
    expect(env).not.toBe(secretSource);
    expect(Object.keys(env).length).toBeLessThan(Object.keys(secretSource).length);
  });

  it("excludes every server secret even though the source env carries them", () => {
    const env = buildAllowlistedChildEnv({}, { source: secretSource });
    for (const secretKey of ["GOVIBE_MCP_TOKEN", "GOVIBE_MSP_TOKEN", "GOVIBE_MSP_API_KEY", "GOVIBE_GKS_TOKEN", "AWS_SECRET_ACCESS_KEY", "DATABASE_URL"]) {
      expect(env).not.toHaveProperty(secretKey);
    }
    expect(JSON.stringify(env)).not.toContain("secret");
  });

  it("passes through only allowlisted, present variables", () => {
    const env = buildAllowlistedChildEnv({}, { source: secretSource });
    expect(env.PATH).toBe("/usr/bin:/bin");
    expect(env.HOME).toBe("/home/dev");
    expect(Object.keys(env).sort()).toEqual(["HOME", "PATH"]);
  });

  it("lets a caller add explicit, deliberate overrides on top of the allowlist", () => {
    const env = buildAllowlistedChildEnv({ AGENT_SCOPED_TOKEN: "fine-to-pass" }, { source: secretSource });
    expect(env.AGENT_SCOPED_TOKEN).toBe("fine-to-pass");
  });

  it("the allowlist itself names no server-secret-shaped variable", () => {
    for (const name of CHILD_ENV_ALLOWLIST) {
      expect(name).not.toMatch(/token|secret|password|credential|api[_-]?key/i);
    }
  });
});
