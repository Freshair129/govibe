// SPEC-Workspace-System conformance suite (TASK-PRD-013).
// Pins acceptance criteria AC-01..AC-06 of docs/specs/SPEC-Workspace-System.md against the
// runtime, so ratifying the spec can point at executable evidence instead of assertion.

import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { calculateWorkspaceImpact, definitionHash, initializeWorkspace, MspClient } from "./index.mjs";

const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0).reverse()) {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture(prefix = "govibe-spec-") {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(root);
  await writeFile(path.join(root, "README.md"), "# Spec fixture\n");
  await writeFile(path.join(root, "package.json"), "{}\n");
  return root;
}

function builtIn() {
  const value = { schema: "govibe-skill-definition/v1", id: "block-decomposition", version: "1.0.0", aliases: ["scan"], inputSchema: {}, outputSchema: {}, permissions: [], stageHooks: [], verificationRequirements: [] };
  return { ...value, contentHash: definitionHash(value) };
}

function mockMsp() {
  const calls = [];
  const client = new MspClient(async (name, input) => {
    calls.push({ name, input });
    if (name === "msp_workspace_register") return { workspace_ref: `msp:workspace/${input.workspace_id}`, registry_ref: "msp:registry/test" };
    throw new Error(`Unexpected tool ${name}`);
  });
  return { client, calls };
}

// Spec §3.1 derivation recipe, replicated independently of vaults.mjs so a silent change to the
// identity derivation breaks this suite instead of passing unnoticed.
const sha24 = (...parts) => createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 24);

const STATE_SCHEMAS = {
  "config.json": "govibe-workspace-config/v1",
  "project-state.json": "govibe-project-state/v1",
  "skill-lock.json": "govibe-skill-lock/v1",
  "vaults.json": "govibe-workspace-vault-bindings/v1",
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function snapshotStateFiles(result) {
  const files = [result.configPath, result.lockPath, result.statePath, result.vaultsPath, result.sharedManifestPath, result.privateManifestPath];
  const entries = await Promise.all(files.map(async (filePath) => [filePath, await readFile(filePath, "utf8")]));
  return Object.fromEntries(entries);
}

describe("SPEC-Workspace-System AC-01 — fresh initialization", () => {
  it("materializes every §4 state file with its exact schema and §3-derived identities", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    const result = await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance", agentId: "spec-agent" });

    expect(result.status).toBe("registered");
    expect(result.deepScanRun).toBe(false);

    for (const [fileName, schema] of Object.entries(STATE_SCHEMAS)) {
      const parsed = await readJson(path.join(result.workspacePath, ".govibe", fileName));
      expect(parsed.schema, fileName).toBe(schema);
    }
    for (const manifestPath of [result.sharedManifestPath, result.privateManifestPath]) {
      expect((await readJson(manifestPath)).schema).toBe("govibe-vault-materialization/v1");
    }

    const config = await readJson(result.configPath);
    const vaults = await readJson(result.vaultsPath);
    const projectSlug = path.basename(result.workspacePath).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const projectId = `project_${sha24(projectSlug)}`;
    const workspaceId = `workspace_${sha24(projectId, result.workspacePath)}`;
    expect(config.projectId).toBe(projectId);
    expect(config.workspaceId).toBe(workspaceId);
    expect(config.projectSlug).toBe(projectSlug);
    expect(vaults.project_id).toBe(projectId);
    expect(vaults.workspace_id).toBe(workspaceId);
    expect(vaults.primary_shared_vault.vault_id).toBe(`vault_${sha24("shared", projectId)}`);
    expect(vaults.workspace_private_vaults[0].vault_id).toBe(`vault_${sha24("private", "spec-agent", workspaceId)}`);
    expect(vaults.global_private_vault.vault_id).toBe(`vault_${sha24("private", "global", "spec-agent")}`);

    // Spec §3.2: shared vault binds project only; workspace-private binds agent+project+workspace;
    // global-private binds agent only.
    expect(vaults.primary_shared_vault).toMatchObject({ agent_id: null, workspace_id: null, project_id: projectId });
    expect(vaults.workspace_private_vaults[0]).toMatchObject({ agent_id: "spec-agent", workspace_id: workspaceId, project_id: projectId });
    expect(vaults.global_private_vault).toMatchObject({ agent_id: "spec-agent", workspace_id: null, project_id: null });

    // Spec §4: materialization paths follow .brain/<project-slug> and .brain/private/<agent-id>.
    expect(vaults.primary_shared_vault.materialization_path).toBe(`.brain/${projectSlug}`);
    expect(vaults.workspace_private_vaults[0].materialization_path).toBe(".brain/private/spec-agent");

    const lock = await readJson(result.lockPath);
    expect(lock.skills).toHaveLength(1);
    expect(lock.skills[0]).toMatchObject({ id: "block-decomposition", version: "1.0.0", contentHash: builtIn().contentHash });

    expect(result.registration.workspaceRef).toMatch(/^msp:workspace\//);
  });

  it("derives distinct workspace_ids for the same project cloned to two paths (§3.1)", async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), "govibe-spec-clone-"));
    roots.push(parent);
    const makeClone = async (name) => {
      const clone = path.join(parent, name, "same-project");
      await mkdir(clone, { recursive: true });
      await writeFile(path.join(clone, "package.json"), "{}\n");
      return clone;
    };
    const first = await initializeWorkspace({ workspacePath: await makeClone("a"), builtInSkill: builtIn(), mspClient: mockMsp().client, actor: "spec-conformance" });
    const second = await initializeWorkspace({ workspacePath: await makeClone("b"), builtInSkill: builtIn(), mspClient: mockMsp().client, actor: "spec-conformance" });
    const [configA, configB] = await Promise.all([readJson(first.configPath), readJson(second.configPath)]);
    expect(configA.projectId).toBe(configB.projectId);
    expect(configA.workspaceId).not.toBe(configB.workspaceId);
  });
});

describe("SPEC-Workspace-System AC-02 — idempotent re-initialization", () => {
  it("leaves on-disk state byte-identical and reuses the deterministic MSP recordId", async () => {
    const root = await fixture();
    const { client, calls } = mockMsp();
    const first = await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance" });
    const before = await snapshotStateFiles(first);

    const second = await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance" });
    const after = await snapshotStateFiles(second);
    expect(after).toEqual(before);

    const registrations = calls.filter((call) => call.name === "msp_workspace_register");
    expect(registrations).toHaveLength(2);
    const [firstKey, secondKey] = registrations.map((call) => call.input.idempotency_key);
    expect(firstKey).toMatch(/^workspace-[a-f0-9]{24}$/);
    expect(secondKey).toBe(firstKey);
    expect(registrations.map((call) => call.input.run_id)).toEqual([`workspace-init-${firstKey.slice("workspace-".length)}`, `workspace-init-${firstKey.slice("workspace-".length)}`]);
  });
});

describe("SPEC-Workspace-System AC-03 — incompatible existing state", () => {
  it("fails on a tampered schema without rewriting the file", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    const first = await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance" });

    const tampered = JSON.stringify({ ...(await readJson(first.configPath)), schema: "govibe-workspace-config/v0" }, null, 2);
    await writeFile(first.configPath, tampered);
    await expect(initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance" })).rejects.toThrow(/Incompatible existing state/);
    expect(await readFile(first.configPath, "utf8")).toBe(tampered);
  });

  it("fails on tampered identity fields without rewriting the file", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    const first = await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance" });

    const tampered = JSON.stringify({ ...(await readJson(first.vaultsPath)), workspace_id: "workspace_000000000000000000000000" }, null, 2);
    await writeFile(first.vaultsPath, tampered);
    await expect(initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "spec-conformance" })).rejects.toThrow(/Incompatible existing state/);
    expect(await readFile(first.vaultsPath, "utf8")).toBe(tampered);
  });
});

describe("SPEC-Workspace-System AC-04 — MSP parent boundary is mandatory", () => {
  it("fails before any side effect when no MSP client is supplied", async () => {
    const root = await fixture();
    await expect(initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), actor: "spec-conformance" })).rejects.toThrow(/requires the MSP parent boundary/);
    await expect(access(path.join(root, ".govibe"))).rejects.toThrow();
  });

  it("fails before any side effect when the client cannot register workspaces", async () => {
    const root = await fixture();
    await expect(initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: {}, actor: "spec-conformance" })).rejects.toThrow(/requires the MSP parent boundary/);
    await expect(access(path.join(root, ".govibe"))).rejects.toThrow();
  });
});

describe("SPEC-Workspace-System AC-05 — explainable impact results", () => {
  it("returns relation chain, distance, score, required action, and unresolved links per §5.4", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-spec-impact-"));
    roots.push(root);
    await mkdir(path.join(root, "docs"), { recursive: true });
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "docs", "CONTRACT.md"), "---\ndoc_id: CONTRACT-ROOT\n---\n# Contract\nSee [[MISSING-DOC]].\n");
    await writeFile(path.join(root, "docs", "CONSUMER.md"), "---\ndoc_id: CONSUMER-ROOT\nrelated_docs:\n  - \"docs/CONTRACT.md\"\n---\n# Consumer\nSee [[CONTRACT-ROOT]].\n");
    await writeFile(path.join(root, "src", "runtime.mjs"), "import contract from '../docs/CONSUMER.md';\nexport default contract;\n");

    const result = await calculateWorkspaceImpact({ workspacePath: root, paths: ["docs/CONTRACT.md"], changeType: "schema_breaking", maxDistance: 3, minimumScore: 0.1 });

    expect(result.schema).toBe("govibe-impact/v2");
    expect(result.affected.length).toBeGreaterThan(0);
    for (const item of result.affected) {
      expect(item.chain.length, item.path).toBeGreaterThan(0);
      for (const hop of item.chain) {
        expect(hop).toMatchObject({ source: expect.any(String), target: expect.any(String), relation: expect.any(String) });
      }
      expect(item.distance).toBeGreaterThanOrEqual(1);
      expect(item.impact_score).toBeGreaterThan(0);
      expect(item.impact_score).toBeLessThanOrEqual(1);
      expect(["must_update", "review_and_update", "review"]).toContain(item.required_action);
      expect(item.reason).toContain(item.path);
    }

    // The dangling [[MISSING-DOC]] wikilink must surface as an unresolved link — the runtime may
    // not claim completeness while unresolved links exist.
    expect(result.unresolved.some((link) => link.label === "MISSING-DOC" && link.reason === "target_not_resolved")).toBe(true);
  });
});

describe("SPEC-Workspace-System AC-06 — no legacy H-axis semantics in workspace surfaces", () => {
  it("finds no abolished H tokens in govibe-core or MCP runtime sources", async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const scanRoots = [path.join(repoRoot, "packages", "govibe-core", "src"), path.join(repoRoot, "scripts", "mcp")];
    // Assembled dynamically so this suite's own source never matches its own scan.
    const forbidden = [
      new RegExp(["context", "scaling", "tier"].join("_"), "i"),
      new RegExp(`classify${"H"}Level|${"H"}LevelClassifier`),
      new RegExp(`(?<![A-Za-z0-9_])${"H"}[56](?![0-9A-Za-z])`),
    ];

    const offenders = [];
    let scannedFiles = 0;
    async function walk(dir) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (/\.(mjs|ts)$/.test(entry.name) && !/\.test\.(mjs|ts)$/.test(entry.name)) {
          scannedFiles += 1;
          const content = await readFile(fullPath, "utf8");
          for (const pattern of forbidden) {
            if (pattern.test(content)) offenders.push(`${path.relative(repoRoot, fullPath)} matches ${pattern}`);
          }
        }
      }
    }
    for (const scanRoot of scanRoots) await walk(scanRoot);
    // Guard against a vacuous pass: both scan roots are real source trees.
    expect(scannedFiles).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
