import { describe, expect, it } from "vitest";

import { GksClient, GksUnavailableError, createGksClientFromEnvironment, createUnavailableGksClient } from "./gks-client.mjs";

describe("GksClient", () => {
  it("fails closed for the deprecated direct GKS client", async () => {
    await expect(new GksClient().upsertCodeKnowledge({})).rejects.toMatchObject({
      code: "DIRECT_GKS_DISABLED",
    });
  });

  it("fails closed when the GKS transport is unavailable", async () => {
    await expect(createUnavailableGksClient().upsertCodeKnowledge({})).rejects.toBeInstanceOf(GksUnavailableError);
  });

  it("does not enable direct GKS access from environment configuration", async () => {
    await expect(createGksClientFromEnvironment({ GOVIBE_GKS_COMMAND: "ignored" }).upsertCodeKnowledge({})).rejects.toBeInstanceOf(GksUnavailableError);
  });
});
