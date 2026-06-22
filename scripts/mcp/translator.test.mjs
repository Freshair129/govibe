import { describe, it, expect } from "vitest";

import { atomize, normalizeHeading } from "./translator/atomizer.mjs";
import { extractTemplate, CONFIDENCE_THRESHOLD } from "./translator/format-template.mjs";
import { render, selectScope } from "./translator/renderer.mjs";
import { evaluate, roundTrip, lexicalScorer } from "./translator/fidelity.mjs";
import { buildRecord, appendRecord } from "./translator/provenance.mjs";

const SAMPLE = `# Goal
Build the translator slice.

# Scope
In scope: ingest and render. Out of scope: multi-team merge.

# Risks
Atomizer may drop content.
`;

describe("atomizer", () => {
  it("decomposes headings into atoms with stable content-identity keys", () => {
    const { atoms } = atomize(SAMPLE);
    expect(atoms.map((a) => a.heading)).toEqual(["Goal", "Scope", "Risks"]);
    // key is content-identity: re-atomizing identical text yields identical keys
    const again = atomize(SAMPLE).atoms;
    expect(again.map((a) => a.key)).toEqual(atoms.map((a) => a.key));
  });

  it("key is stable across heading numbering/case changes", () => {
    const a = atomize("# Goal\nBuild it.").atoms[0];
    const b = atomize("## 1. GOAL\nBuild it.").atoms[0];
    expect(normalizeHeading("## 1. GOAL")).toBe("goal");
    expect(b.key).toBe(a.key);
  });
});

describe("format-template (hybrid)", () => {
  it("extracts sections and flags low-confidence ones for confirm", () => {
    const tpl = extractTemplate(SAMPLE + "\n# TBD\n\n", { repo: "demo" });
    expect(tpl.sections.map((s) => s.key)).toContain("goal");
    expect(tpl.needsConfirm).toContain("TBD"); // boilerplate heading => low confidence
    expect(tpl.confidence).toBeLessThanOrEqual(1);
    expect(CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
  });
});

describe("render + scope", () => {
  it("round-trips: render then re-atomize preserves every source atom", () => {
    const { atoms } = atomize(SAMPLE);
    const tpl = extractTemplate(SAMPLE, { repo: "demo" });
    const out = render(atoms, tpl);
    expect(roundTrip(atoms, out).ok).toBe(true);
  });

  it("format-adapts: same atoms render into a different paradigm, still round-trip clean", () => {
    const { atoms } = atomize(SAMPLE);
    const tpl1 = extractTemplate(SAMPLE, { repo: "a" });
    const tpl2 = {
      naming: { case: "upper", numbered: true },
      sections: [
        { key: "risks", order: 0 },
        { key: "scope", order: 1 },
        { key: "goal", order: 2 },
      ],
    };
    const out1 = render(atoms, tpl1);
    const out2 = render(atoms, tpl2);
    expect(out1).not.toEqual(out2); // different order/naming
    expect(out2).toMatch(/1\. RISKS/); // numbered + upper applied
    expect(roundTrip(atoms, out1).ok).toBe(true);
    expect(roundTrip(atoms, out2).ok).toBe(true); // content identity survives format change
  });

  it("selectScope bounds by hop", () => {
    const { atoms } = atomize("# A\nx\n## A1\ny\n### A11\nz\n# B\nw");
    const root = atoms.find((a) => a.heading === "A");
    const picked = selectScope(atoms, { selectorId: root.id, hop: 1 }).map((a) => a.heading);
    expect(picked).toEqual(["A", "A1"]); // A11 is 2 hops down, B is a sibling
  });
});

describe("fidelity gate (both metrics)", () => {
  const { atoms } = atomize(SAMPLE);
  const tpl = extractTemplate(SAMPLE, { repo: "demo" });

  it("passes a clean render", () => {
    const out = render(atoms, tpl);
    const v = evaluate({ sourceAtoms: atoms, sourceText: SAMPLE, rendered: out });
    expect(v.verdict).toBe("pass");
  });

  it("blocks when an atom is dropped (structural loss)", () => {
    const lossy = render(atoms.slice(0, 2), tpl); // drop "Risks"
    const v = evaluate({ sourceAtoms: atoms, sourceText: SAMPLE, rendered: lossy });
    expect(v.roundTrip.lost.length).toBeGreaterThan(0);
    expect(v.verdict).toBe("block");
  });

  it("flags on mid semantic score with clean round-trip", () => {
    const out = render(atoms, tpl);
    const v = evaluate({
      sourceAtoms: atoms,
      sourceText: SAMPLE,
      rendered: out,
      scorer: () => ({ score: 0.6, confidence: 0.4 }), // >= FLAG, < PASS/CONF
    });
    expect(v.verdict).toBe("flag");
  });

  it("blocks on low semantic score even when round-trip is clean", () => {
    const out = render(atoms, tpl);
    const v = evaluate({
      sourceAtoms: atoms,
      sourceText: SAMPLE,
      rendered: out,
      scorer: () => ({ score: 0.2, confidence: 0.2 }),
    });
    expect(v.verdict).toBe("block");
  });

  it("default lexical scorer is deterministic and high for identical text", () => {
    expect(lexicalScorer("alpha beta", "alpha beta").score).toBe(1);
  });
});

describe("provenance (jsonl, injectable)", () => {
  it("builds an MSP-shaped record and appends via an injected writer", () => {
    const captured = [];
    const rec = buildRecord({
      kind: "render",
      auditRef: "audit:1",
      actor: "tester",
      citedAtoms: ["goal"],
      fidelity: { verdict: "pass", semantic: { score: 1 } },
      startedAt: "2026-06-22T00:00:00Z",
      endedAt: "2026-06-22T00:00:01Z",
    });
    appendRecord(rec, { writer: (r) => captured.push(r) });
    expect(captured).toHaveLength(1);
    expect(captured[0].kind).toBe("render");
    expect(captured[0].fidelity).toEqual({ verdict: "pass", score: 1 });
  });
});
