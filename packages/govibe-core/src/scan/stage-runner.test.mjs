import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

import { MspClient } from "../msp-client.mjs";
import { inventoryWorkspace } from "./scan.mjs";
import { createDefaultStageAdapters } from "./stage-adapters.mjs";
import { STAGE_GRAPH_BUDGET } from "./graph-presentation-policy.mjs";
import { runDeepScan } from "./stage-runner.mjs";

// TASK-PRD-007: runDeepScan() must surface the observed candidate graph it already computes
// (and already submits to MSP via knowledgePayload()) so Mission Control's six graph/symbol
// views have something to consume -- without changing what is submitted to MSP.

const roots = [];
// TASK-PRD-007 (B3, round 3): inventoryWorkspace() now spawns `git -C <path> ls-files` per scan.
// On Windows, a just-exited child process can hold the directory tree's handle for a few ms after
// its promise resolves, which can race this cleanup into EBUSY -- maxRetries/retryDelay is Node's
// own documented mitigation for exactly this (see fs.promises.rm docs), not a real leak.
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))));

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-stage-runner-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "README.md"), "# Test\n\n[[other]]\n");
  await writeFile(path.join(root, "package.json"), '{"scripts":{"build":"tsc"}}\n');
  await writeFile(path.join(root, "src", "a.ts"), "export function a() { b(); }\nexport function b() {}\n");
  return root;
}

function mockMsp() {
  const calls = [];
  const client = new MspClient(async (name, input) => {
    calls.push({ name, input });
    if (name === "msp_knowledge_promote") return { knowledge_ref: `gks:${input.idempotency_key}`, source_hash: "c".repeat(64), promotion_ref: `msp:promotion/${input.idempotency_key}` };
    if (name === "msp_evidence_record") return { proof_ref: `msp:proof/${input.idempotency_key}` };
    throw new Error(`Unexpected tool ${name}`);
  });
  return { client, calls };
}

async function deepScan(root, client, overrides = {}) {
  const inventory = await inventoryWorkspace(root);
  return runDeepScan({ workspacePath: root, workspaceId: null, inventory, mspClient: client, actor: "test", adapters: createDefaultStageAdapters(), runId: overrides.runId ?? "stage-runner-1", resume: false, ...overrides });
}

describe("runDeepScan observed graph accumulation", () => {
  it("returns an observed field with nodes/edges/symbols/totals/truncated, uncapped for a small workspace", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    const result = await deepScan(root, client);

    expect(result.observed).toBeDefined();
    expect(Array.isArray(result.observed.nodes)).toBe(true);
    expect(Array.isArray(result.observed.edges)).toBe(true);
    expect(Array.isArray(result.observed.symbols)).toBe(true);
    expect(result.observed.truncated).toBe(false);
    // Every file/directory/markdown/symbol candidate produced across the twelve stages should be
    // present, and totals must equal what was actually produced by the stages (raw, pre-cap).
    expect(result.observed.nodes.length).toBeGreaterThan(0);
    expect(result.observed.symbols.length).toBeGreaterThan(0);
    expect(result.observed.totals.nodes).toBe(result.observed.nodes.length);
    expect(result.observed.totals.edges).toBe(result.observed.edges.length);
    expect(result.observed.totals.symbols).toBe(result.observed.symbols.length);
    // Known candidates: file nodes from stage 1, TS symbols "a"/"b" from stage 5.
    expect(result.observed.nodes.some((node) => node.id === "file:package.json")).toBe(true);
    expect(result.observed.symbols.some((symbol) => symbol.name === "a")).toBe(true);
    expect(result.observed.symbols.some((symbol) => symbol.name === "b")).toBe(true);
  });

  it("does not change what is submitted to MSP (byte-identical knowledgePayload)", async () => {
    const root = await fixture();
    const { client, calls } = mockMsp();
    await deepScan(root, client);
    const promotions = calls.filter((call) => call.name === "msp_knowledge_promote");
    expect(promotions.length).toBeGreaterThan(0);
    for (const call of promotions) {
      expect(call.input.candidate).toHaveProperty("atoms");
      expect(call.input.candidate).toHaveProperty("symbols");
      expect(call.input.candidate).toHaveProperty("relations");
      expect(call.input.candidate).toHaveProperty("context_snapshots");
    }
    // The symbolic-parse stage (stage 5) submits exactly its own output.symbols -- unaffected by
    // the separate observed accumulator, and never capped even if the accumulator is.
    const symbolicPromotion = promotions.find((call) => call.input.stage === 5);
    expect(symbolicPromotion.input.candidate.symbols.map((symbol) => symbol.name).sort()).toEqual(["a", "b"]);
  });

  // TASK-PRD-007 (D1): per-stage quotas. A fixture large/varied enough that the quota actually
  // binds AND stage 1 (many file nodes) does not starve stage 3 (markdown) or stage 5 (symbols).
  it("caps each stage's contribution at STAGE_GRAPH_BUDGET independently, so an early high-volume stage cannot starve later stages", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-stage-runner-quota-"));
    roots.push(root);
    await mkdir(path.join(root, "src"));
    // Stage 1 alone produces far more file nodes than STAGE_GRAPH_BUDGET.nodes.
    const fileCount = STAGE_GRAPH_BUDGET.nodes + 200;
    for (let index = 0; index < fileCount; index += 1) {
      await writeFile(path.join(root, "src", `file-${String(index).padStart(4, "0")}.ts`), `export function fn${index}() {}\n`);
    }
    await writeFile(path.join(root, "README.md"), "# Quota fixture\n");
    await writeFile(path.join(root, "package.json"), '{"scripts":{"build":"tsc"}}\n');

    const { client, calls } = mockMsp();
    const result = await deepScan(root, client, { runId: "stage-runner-quota" });

    expect(result.observed.truncated).toBe(true);
    // Stage 1's contribution is capped at the per-stage node budget...
    expect(result.observed.nodes.filter((node) => node.id.startsWith("file:")).length).toBeLessThanOrEqual(STAGE_GRAPH_BUDGET.nodes);
    // ...but totals still reflect the real, uncapped production.
    expect(result.observed.totals.nodes).toBeGreaterThanOrEqual(fileCount);
    // TASK-PRD-007 (round 3): the anti-starvation test previously only asserted stage 1's own
    // node COUNT stayed under budget and that totals were uncapped -- both hold true even under
    // the round-1 regression this test exists to catch (a single GLOBAL node budget shared across
    // all stages instead of one per stage), because stage 1 alone exceeds the budget either way.
    // What a global-budget regression actually breaks is stage 2 (directory:) and stage 3
    // (markdown:) getting ANY node budget left after stage 1 exhausts a shared pool -- assert
    // those specific nodes actually survive.
    expect(result.observed.nodes.some((node) => node.id === "directory:src")).toBe(true);
    expect(result.observed.nodes.some((node) => node.id === "markdown:README.md")).toBe(true);
    // Stage 5 (symbols) still gets its own, independent budget -- not starved by stage 1's cap.
    expect(result.observed.symbols.length).toBeGreaterThan(0);
    expect(result.observed.symbols.length).toBeLessThanOrEqual(STAGE_GRAPH_BUDGET.symbols);

    // MSP submission for every stage still carries the FULL, uncapped output regardless of the
    // accumulator's per-stage cap.
    const stage1Promotion = calls.find((call) => call.name === "msp_knowledge_promote" && call.input.stage === 1);
    expect(stage1Promotion.input.candidate.atoms.length).toBeGreaterThanOrEqual(fileCount);
    // This fixture must be big enough for the per-stage quota to actually bind (STAGE_GRAPH_BUDGET
    // .nodes + 200 files), and stages 5/6/7/9/10 each run their own full TypeScript AST pass over
    // all of them -- five parses of 700 files. Run in isolation this file takes ~8-10s wall, well
    // inside the suite's 30s default testTimeout; under full-suite worker contention (124 files)
    // it reaches 30s and the test failed on timeout alone rather than on any assertion. Two agents
    // read that as environmental and dismissed it -- it was not, it is a test sitting on its own
    // limit. Raised explicitly rather than shrinking the fixture, which would stop the quota
    // binding and silently void the anti-starvation property this test exists to hold. The
    // underlying cost -- five redundant full-repo AST passes with no caching between stages -- is
    // a known open performance item, not something this test should paper over.
  }, 120_000);

  // TASK-PRD-007 (B3, round 3): owner-approved MSP semantic change -- scratch and gitignored
  // paths are now excluded from the scan INVENTORY itself (scan.mjs), not just from the
  // presentation accumulator. This SUPERSEDES the old D1-era behavior (this test used to assert
  // the opposite: that MSP received scratch candidates even though the graph view hid them).
  it("excludes SCRATCH_PATH_ROOTS paths (.agents/, .claude/, .brain/, state/runs/) from BOTH the observed accumulator AND MSP submission", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-stage-runner-scratch-"));
    roots.push(root);
    await mkdir(path.join(root, "src"));
    await mkdir(path.join(root, ".agents"));
    await writeFile(path.join(root, "src", "a.ts"), "export function a() {}\n");
    await writeFile(path.join(root, ".agents", "scratch.md"), "# Scratch note\n");
    await writeFile(path.join(root, "package.json"), "{}\n");

    const { client, calls } = mockMsp();
    const result = await deepScan(root, client, { runId: "stage-runner-scratch" });

    // Not published to the observed accumulator...
    expect(result.observed.nodes.some((node) => node.id === "file:.agents/scratch.md")).toBe(false);
    // ...and (B3, round 3) no longer reaches MSP submission either -- the inventory itself never
    // discovered it, so stage 1 could not have produced a candidate for it.
    const stage1Promotion = calls.find((call) => call.name === "msp_knowledge_promote" && call.input.stage === 1);
    expect(stage1Promotion.input.candidate.atoms.some((node) => node.id === "file:.agents/scratch.md")).toBe(false);
    // Real project source outside any scratch root is unaffected.
    expect(result.observed.nodes.some((node) => node.id === "file:src/a.ts")).toBe(true);
    expect(stage1Promotion.input.candidate.atoms.some((node) => node.id === "file:src/a.ts")).toBe(true);
  });

  // TASK-PRD-007 (B3, round 3): the general case -- a path excluded by the repo's OWN .gitignore
  // (not the small hand-maintained SCRATCH_PATH_ROOTS list) -- requires a real git working tree,
  // since scan.mjs asks `git ls-files` for this rather than reimplementing gitignore semantics.
  it("excludes a real .gitignore match (including a negation) from BOTH the observed accumulator AND MSP submission", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-stage-runner-gitignore-"));
    roots.push(root);
    await execFileAsync("git", ["init", "-q"], { cwd: root });
    await mkdir(path.join(root, "src"));
    await mkdir(path.join(root, "ref"));
    await mkdir(path.join(root, "local_model"));
    await writeFile(path.join(root, ".gitignore"), "ref/\nlocal_model/*\n!local_model/auto_scanned_models.json\n");
    await writeFile(path.join(root, "src", "a.ts"), "export function a() {}\n");
    await writeFile(path.join(root, "ref", "vendored.ts"), "export function vendored() {}\n");
    await writeFile(path.join(root, "local_model", "big.bin"), "not source\n");
    await writeFile(path.join(root, "local_model", "auto_scanned_models.json"), "{}\n");
    await writeFile(path.join(root, "package.json"), "{}\n");

    const { client, calls } = mockMsp();
    const result = await deepScan(root, client, { runId: "stage-runner-gitignore" });

    // ref/ (plain ignore) and local_model/big.bin (ignore + no matching negation) are absent from
    // both the observed accumulator and MSP submission.
    expect(result.observed.nodes.some((node) => node.id === "file:ref/vendored.ts")).toBe(false);
    expect(result.observed.symbols.some((symbol) => symbol.path === "ref/vendored.ts")).toBe(false);
    const stage1Promotion = calls.find((call) => call.name === "msp_knowledge_promote" && call.input.stage === 1);
    expect(stage1Promotion.input.candidate.atoms.some((node) => node.id === "file:ref/vendored.ts")).toBe(false);
    expect(stage1Promotion.input.candidate.atoms.some((node) => node.id === "file:local_model/big.bin")).toBe(false);
    // local_model/auto_scanned_models.json (negated back in) DOES reach both -- negations honored.
    expect(stage1Promotion.input.candidate.atoms.some((node) => node.id === "file:local_model/auto_scanned_models.json")).toBe(true);
    const stage5Promotion = calls.find((call) => call.name === "msp_knowledge_promote" && call.input.stage === 5);
    expect(stage5Promotion.input.candidate.symbols.some((symbol) => symbol.path === "ref/vendored.ts")).toBe(false);
    expect(stage5Promotion.input.candidate.symbols.some((symbol) => symbol.name === "a")).toBe(true);
  });

  it("keeps the accumulator scoped to successful stage output only (incomplete/not_applicable stages contribute nothing)", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    const result = await deepScan(root, client);
    // Stage 4 (COBOL) is not_applicable for this fixture and must not appear in observed.
    expect(result.observed.nodes.some((node) => typeof node.id === "string" && node.id.startsWith("cobol:"))).toBe(false);
  });

  // TASK-PRD-007 (F7): a stage whose promotion throws must not leave candidates behind.
  it("does not accumulate a stage's candidates when its MSP promotion throws (stage recorded failed)", async () => {
    const root = await fixture();
    const client = new MspClient(async (name, input) => {
      if (name === "msp_evidence_record") return { proof_ref: `msp:proof/${input.idempotency_key}` };
      if (name === "msp_knowledge_promote" && input.stage === 1) throw new Error("promotion unavailable");
      if (name === "msp_knowledge_promote") return { knowledge_ref: `gks:${input.idempotency_key}`, source_hash: "c".repeat(64), promotion_ref: `msp:promotion/${input.idempotency_key}` };
      throw new Error(`Unexpected tool ${name}`);
    });
    const result = await deepScan(root, client, { runId: "stage-runner-f7" });

    const stage1 = result.stageRuns.find((run) => run.stage === 1);
    expect(stage1.status).toBe("failed");
    // Stage 1's file nodes must NOT be in the accumulator despite the adapter having produced them.
    expect(result.observed.nodes.some((node) => node.id === "file:package.json")).toBe(false);
    // Other, successful stages still contribute normally.
    expect(result.observed.symbols.some((symbol) => symbol.name === "a")).toBe(true);
  });
});
