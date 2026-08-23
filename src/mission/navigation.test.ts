import { describe, expect, it } from "vitest";

import type { ViewId } from "./domain";
import { defaultViewByDomain, findSubModule, missionDomains, viewTitle } from "./navigation";

// TASK-PRD-008. The sidebar label and the on-screen view header used to be two independently
// edited strings, and four of them had drifted: A4's sidebar still read "Brain & Config" long
// after BrainConfig became one panel inside the broader Vault/Context/Impact view, B2 rendered
// "Functional Specifications" under a "Business Specifications" entry, B3 rendered "Interactive
// Graph Studio" under "Interactive Graph", and D2 rendered "Cyber Reactor Real-time Heatmap"
// under "Cyber Reactor Heatmap" -- while snapshot.heatmap has no producer at all, so "Real-time"
// was doubly untrue.
//
// The fix is structural rather than a one-off rename: navigation.ts is now the single source and
// views read viewTitle(id), so the two cannot disagree unless an entry deliberately declares a
// `title` override -- which these tests require to carry a `titleNote`.

const ALL_VIEW_IDS: ViewId[] = [
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4", "C5",
  "D1", "D2", "D3",
];

const allSubModules = Object.values(missionDomains).flatMap((domain) => domain.subModules);

describe("navigation map", () => {
  it("covers every ViewId exactly once", () => {
    const ids = allSubModules.map((entry) => entry.id).sort();
    expect(ids).toEqual([...ALL_VIEW_IDS].sort());
  });

  it("resolves a title for every ViewId", () => {
    for (const id of ALL_VIEW_IDS) {
      expect(viewTitle(id), `no title resolved for ${id}`).toBeTruthy();
    }
  });

  it("throws on an unknown ViewId rather than returning a misleading empty title", () => {
    expect(() => viewTitle("Z9" as ViewId)).toThrow(/Unknown ViewId/);
  });

  it("points every domain default at a view that domain actually owns", () => {
    for (const [domainId, viewId] of Object.entries(defaultViewByDomain)) {
      const owned = missionDomains[domainId as keyof typeof missionDomains].subModules.map((entry) => entry.id);
      expect(owned, `${domainId} default ${viewId} is not one of its own sub-modules`).toContain(viewId);
    }
  });
});

describe("view header and sidebar label agreement", () => {
  // The whole point of the task: a header defaults to its sidebar label, so drift is impossible
  // unless someone deliberately overrides it.
  it("defaults each view header to its sidebar label", () => {
    for (const entry of allSubModules) {
      if (entry.title === undefined) {
        expect(viewTitle(entry.id)).toBe(entry.name);
      }
    }
  });

  // A difference is allowed, but never silent: it has to say why. This is the assertion that
  // fails when a future rename desynchronises the two (TASK-PRD-008 exit criterion) -- either
  // the strings match, or the entry records a deliberate reason for differing.
  it("requires a recorded reason for every header that differs from its sidebar label", () => {
    const undocumented = allSubModules
      .filter((entry) => entry.title !== undefined && entry.title !== entry.name)
      .filter((entry) => !entry.titleNote?.trim());

    expect(
      undocumented.map((entry) => `${entry.id}: "${entry.name}" vs "${entry.title}"`),
      "a view header may differ from its sidebar label only with a titleNote recording the decision",
    ).toEqual([]);
  });

  it("does not carry a title override that merely repeats the sidebar label", () => {
    const redundant = allSubModules.filter((entry) => entry.title !== undefined && entry.title === entry.name);
    expect(redundant.map((entry) => entry.id), "drop the redundant title override").toEqual([]);
  });

  it("exposes each entry through findSubModule", () => {
    for (const id of ALL_VIEW_IDS) {
      expect(findSubModule(id)?.id).toBe(id);
    }
    expect(findSubModule("Z9" as ViewId)).toBeUndefined();
  });
});

// A2 (Roadmap Board) is a known, deliberate exception: it renders no ViewHeader at all. That is
// an ABSENT header, not a mismatched one, and adding a header to that dense drag-and-drop board
// is a layout change that could not be verified without running the app -- so it is recorded here
// rather than guessed at. This test pins the exception so it stays a decision: if RoadmapBoard
// ever gains a header, this fails and whoever adds it must wire it to viewTitle("A2") and delete
// this test.
describe("recorded exceptions", () => {
  it("A2 Roadmap Board renders no view header, by record", async () => {
    const source = (await import("../features/roadmap/RoadmapBoard.tsx?raw")).default as string;
    expect(source).not.toContain("<ViewHeader");
    expect(viewTitle("A2")).toBe("Roadmap Board");
  });
});
