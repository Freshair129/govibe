import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseAgentRegistry } from "./agent-registry-service.mjs";

describe("agent registry service", () => {
  it("parses the real registry with YAML semantics", async () => {
    const agents = parseAgentRegistry(await readFile(".agents/agent-registry.yaml", "utf8"));
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toMatchObject({ status: "registered", model: "Registry-defined" });
    expect(Array.isArray(agents[0].fleet.responsibility)).toBe(true);
  });

  it("supports quoted scalars and nested execution policy", () => {
    const [agent] = parseAgentRegistry('agents:\n  test:\n    label: "Test Agent"\n    role: qa\n    responsibility: ["proof"]\n    authority:\n      can: ["read"]\n      cannot: []\n    source_refs: ["AGENTS.md"]\n    execution_policy:\n      default_executor: codex\n      default_mode: audit\n      local_model_tier: default\n');
    expect(agent).toMatchObject({ name: "Test Agent", defaultExecutor: "codex", defaultMode: "audit", modelTier: "default" });
  });

  it("fails closed for invalid YAML and invalid list fields", () => {
    expect(() => parseAgentRegistry("agents: [")).toThrow("invalid YAML");
    expect(() => parseAgentRegistry("agents:\n  test:\n    responsibility: nope\n")).toThrow("must be a string array");
  });
});
