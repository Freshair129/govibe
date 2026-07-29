import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { definitionHash, installSkillDefinition, resolveSkill } from "./skill-registry.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function temp() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-skill-"));
  roots.push(root);
  return root;
}

function skill(version = "1.0.0") {
  const value = { schema: "govibe-skill-definition/v1", id: "scan", version, aliases: [], inputSchema: {}, outputSchema: {}, permissions: [], stageHooks: [], verificationRequirements: [] };
  return { ...value, contentHash: definitionHash(value) };
}

describe("Skill Registry", () => {
  it("resolves a global install and an exact workspace pin", async () => {
    const workspacePath = await temp();
    const globalRoot = path.join(await temp(), "skills");
    const installed = await installSkillDefinition(skill(), globalRoot);
    const resolved = await resolveSkill({ workspacePath, globalRoot, id: "scan", version: "1.0.0", contentHash: installed.definition.contentHash });
    expect(resolved.contentHash).toBe(installed.definition.contentHash);
  });

  it("rejects hash mismatch, untrusted override, and missing version", async () => {
    const workspacePath = await temp();
    const globalRoot = path.join(await temp(), "skills");
    await installSkillDefinition(skill(), globalRoot);
    await expect(resolveSkill({ workspacePath, globalRoot, id: "scan", version: "1.0.0", contentHash: "sha256:bad" })).rejects.toThrow(/Pinned skill hash mismatch/);

    await installSkillDefinition({ ...skill(), aliases: ["changed"] }, path.join(workspacePath, ".govibe", "skills"));
    await expect(resolveSkill({ workspacePath, globalRoot, id: "scan", version: "1.0.0", trustWorkspaceSkills: true })).rejects.toThrow(/Untrusted override/);
    await expect(resolveSkill({ workspacePath, globalRoot, id: "scan", version: "9.0.0" })).rejects.toThrow(/Missing skill version/);
  });

  it("does not let workspace configuration self-authorize a local skill", async () => {
    const workspacePath = await temp();
    const globalRoot = path.join(await temp(), "skills");
    await installSkillDefinition(skill(), path.join(workspacePath, ".govibe", "skills"));
    await expect(resolveSkill({ workspacePath, globalRoot, id: "scan", version: "1.0.0" })).rejects.toThrow(/Untrusted workspace skill/);
    await expect(resolveSkill({ workspacePath, globalRoot, id: "scan", version: "1.0.0", trustedWorkspaceHashes: [skill().contentHash] })).resolves.toMatchObject({ id: "scan" });
  });

  it("rejects path traversal in skill identity", async () => {
    const workspacePath = await temp();
    const globalRoot = path.join(await temp(), "skills");
    await expect(resolveSkill({ workspacePath, globalRoot, id: "../escape", version: "1.0.0" })).rejects.toThrow(/Invalid skill id/);
    await expect(resolveSkill({ workspacePath, globalRoot, id: "scan", version: "../../escape" })).rejects.toThrow(/Invalid skill version/);
  });
});
