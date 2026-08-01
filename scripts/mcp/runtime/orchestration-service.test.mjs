import { describe, expect, it } from "vitest";
import { OrchestrationService } from "./orchestration-service.mjs";

describe("orchestration service", () => {
  it("is constructible with injected runtime ports and no transport startup", () => {
    const service = new OrchestrationService({ workspaceRoot: process.cwd(), runAgent: async () => ({}), applyMutation: async () => ({}), appendTerminal: () => {}, logEvent: () => {}, emit: () => {} });
    expect(service).toBeInstanceOf(OrchestrationService);
  });
});
