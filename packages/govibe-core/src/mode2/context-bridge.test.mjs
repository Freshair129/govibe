import { describe, expect, it } from "vitest";

import { CONTEXT_PROFILES } from "../context-lineage.mjs";
import { buildMode2ContextPacket, BUDGET_UNITS, DEFAULT_CONTEXT_BUDGET, DEFAULT_CONTEXT_PROFILE, selectContextSlice } from "./context-bridge.mjs";

const workspaceBinding = { workspace_id: "workspace_abc", project_id: "project_abc", metadata_root: ".govibe/mode2" };
const skill = { id: "block-decomposition", version: "1.0.0", contentHash: "deadbeef" };

const ir = {
  atoms: [
    { identity: "mode2-atom:a", type: "symbol:function", dimension: "structure", source: "src/a.ts", confidence: 1, explicit: true, inferred: false },
    { identity: "mode2-atom:b", type: "symbol:function", dimension: "structure", source: "src/b.ts", confidence: 0.5, explicit: false, inferred: true },
  ],
  relations: [{ identity: "mode2-relation:r", rel: "IMPORTS", dimension: "dependency" }],
};
const gapAnalysis = {
  counts: { total: 3 },
  findings: [
    { id: "g1", gap_class: "unimplemented_requirement", subject: "FR-001", severity: "warning", description: "declared, unclaimed", evidence: ["docs/PRD.md"], resolution: "candidate-for-human-review" },
    { id: "g2", gap_class: "orphan_tests", subject: "tests", severity: "info", description: "orphan", evidence: ["t.test.ts"], resolution: "candidate-for-human-review" },
    { id: "g3", gap_class: "missing_tests", subject: "modules", severity: "warning", description: "untested", evidence: ["src/a.ts", "src/b.ts"], resolution: "candidate-for-human-review" },
  ],
};
const coverage = { block_profile: "service-governed", coverage_ratio: 0.8, missing: ["requirement"] };
const roadmap = {
  tasks: [
    { id: "T1", title: "close FR-001", why: "declared, unclaimed", complexity: "C-2", access_scope: "H2", acceptance_criteria: ["Given X When Y Then Z"], verification: ["Mode 2 full scan"], traces_to: "g1" },
  ],
};
const views = { generated: [{ view_id: "mode2-view:04-erd:abc", catalog_id: "04-erd", projection_state: "PARTIAL", derived_count: 3 }] };

const base = { ir, gapAnalysis, coverage, roadmap, views };

describe("bounded selection", () => {
  it("fits within the declared budget and reports what it spent", () => {
    const slice = selectContextSlice({ ...base, budget: { unit: "characters", max: 20000 } });
    expect(slice.context_budget.spent).toBeLessThanOrEqual(20000);
    expect(slice.context_budget.remaining).toBe(20000 - slice.context_budget.spent);
    expect(slice.projection_state).toBe("EQUIVALENT");
    expect(slice.omitted_count).toBe(0);
  });

  it("declares truncation rather than looking like a smaller problem", () => {
    const slice = selectContextSlice({ ...base, budget: { unit: "items", max: 3 } });
    expect(slice.omitted_count).toBeGreaterThan(0);
    // Semantic conservation: a dropped item makes the slice PARTIAL, never EQUIVALENT.
    expect(slice.projection_state).toBe("PARTIAL");
    expect(slice.omitted_note).toMatch(/did not fit/);
    // The total is still reported, so a consumer can see it received a subset.
    expect(slice.summary.gap_total).toBe(3);
  });

  it("ranks warnings above info and explicit atoms above inferred", () => {
    const slice = selectContextSlice({ ...base, budget: { unit: "items", max: 4 } });
    expect(slice.gaps[0].severity).toBe("warning");
    if (slice.atoms.length) expect(slice.atoms[0].inferred).toBe(false);
  });

  it("rejects an invalid budget instead of silently defaulting", () => {
    expect(() => selectContextSlice({ ...base, budget: { unit: "tokens", max: 10 } })).toThrow(/Invalid context budget unit/);
    expect(() => selectContextSlice({ ...base, budget: { unit: "items", max: 0 } })).toThrow(/positive number/);
    expect(BUDGET_UNITS).toEqual(["characters", "items"]);
  });

  it("narrows to a focus path set when one is given", () => {
    const slice = selectContextSlice({ ...base, focus: { paths: ["src/a.ts"] } });
    expect(slice.atoms.every((atom) => atom.source === "src/a.ts")).toBe(true);
    expect(slice.focus.paths).toEqual(["src/a.ts"]);
  });
});

describe("the two governing constraints", () => {
  it("never presents Mode 2 output as canonical", () => {
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse" });
    expect(packet.mode2.canonical).toBe(false);
    expect(packet.mode2.promotion_state).toBe("candidate");
    expect(packet.mode2.slice.canonical).toBe(false);
    // Candidates must not enter as shared-vault knowledge — that would present unpromoted
    // findings as governed truth. They enter as task/event context instead.
    expect(packet.knowledgeRefs).toEqual([]);
    expect(packet.taskEventRefs[0]).toMatch(/^mode2-slice:/);
    expect(packet.policyDecisions.map((item) => item.decision)).toContain("mode2_output_is_candidate");
    expect(packet.constraints[0]).toMatch(/candidates, not canonical/);
  });

  it("keeps context_budget as its own axis and never lets it widen access", () => {
    const small = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse", budget: { unit: "items", max: 2 } });
    const large = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse", budget: { unit: "characters", max: 60000 } });
    // A larger budget changes how much context is carried and nothing about permission.
    expect(large.mode2.omitted_count).toBeLessThan(small.mode2.omitted_count);
    expect(large.contextProfile).toBe(small.contextProfile);
    expect(packetHasAccessField(large)).toBe(false);
    expect(large.policyDecisions.map((item) => item.decision)).toContain("context_budget_is_its_own_axis");
  });
});

function packetHasAccessField(packet) {
  return Object.keys(packet).some((key) => /access_scope|maxHops|retrieval_radius/i.test(key));
}

describe("profile handling", () => {
  it("defaults to T-ctx, which forbids reaching into agent private memory", () => {
    expect(DEFAULT_CONTEXT_PROFILE).toBe("T-ctx");
    expect(CONTEXT_PROFILES).toContain(DEFAULT_CONTEXT_PROFILE);
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse" });
    expect(packet.contextProfile).toBe("T-ctx");
    // The upstream builder rejects private vault refs under T-ctx; Mode 2 supplies none.
    expect(packet.globalStateRefs).toEqual([]);
    expect(packet.workspaceStateRefs).toEqual([]);
  });

  it("delegates lineage to the existing builder rather than minting its own", () => {
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse" });
    expect(packet.contextId).toMatch(/^ctx_/);
    expect(packet.cacheId).toMatch(/^cache_/);
    expect(packet.contextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(packet.sourceManifestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("enforces the upstream W-ctx and M-ctx invariants instead of bypassing them", () => {
    // W-ctx needs exactly one workflow reference, which a scan-derived packet does not have.
    expect(() => buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "x", contextProfile: "W-ctx" })).toThrow(/W-ctx requires exactly one/);
    // M-ctx after its first turn needs a parent; the invariant is the builder's, not ours.
    expect(() => buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "x", contextProfile: "M-ctx" })).toThrow(/parentContextId/);
    const initial = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "x", contextProfile: "M-ctx", mContextInitial: true });
    expect(initial.contextProfile).toBe("M-ctx");
  });
});

describe("inputs it refuses to invent", () => {
  it("requires a real skill reference and never synthesizes one", () => {
    expect(() => buildMode2ContextPacket({ ...base, workspaceBinding, objective: "x" })).toThrow(/never synthesized/);
    expect(() => buildMode2ContextPacket({ ...base, workspaceBinding, skill: { id: "x" }, objective: "x" })).toThrow(/never synthesized/);
  });

  it("requires a bound workspace and an objective", () => {
    expect(() => buildMode2ContextPacket({ ...base, skill, objective: "x" })).toThrow(/bound workspace/);
    expect(() => buildMode2ContextPacket({ ...base, workspaceBinding, skill })).toThrow(/objective/);
  });
});

describe("packet content", () => {
  it("carries verification expectations and critical issues derived from the slice", () => {
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse" });
    expect(packet.verificationExpectations).toContain("Mode 2 full scan");
    // No deterministic finding is critical, so this list is legitimately empty here.
    expect(packet.criticalKnownIssues).toEqual([]);
    expect(packet.sourceRefs.some((ref) => ref.required)).toBe(true);
  });

  it("tells the executor not to auto-resolve a contradiction", () => {
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse" });
    expect(packet.constraints.some((entry) => /Do not auto-resolve/.test(entry))).toBe(true);
    expect(packet.mode2.slice.gaps.every((gap) => gap.resolution === "candidate-for-human-review")).toBe(true);
  });

  it("warns in-band when the context it carries is truncated", () => {
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse", budget: { unit: "items", max: 2 } });
    expect(packet.constraints.some((entry) => /truncated/i.test(entry))).toBe(true);
  });

  it("uses the default budget when none is supplied", () => {
    const packet = buildMode2ContextPacket({ ...base, workspaceBinding, skill, objective: "analyse" });
    expect(packet.mode2.context_budget.unit).toBe(DEFAULT_CONTEXT_BUDGET.unit);
    expect(packet.mode2.context_budget.max).toBe(DEFAULT_CONTEXT_BUDGET.max);
  });
});
