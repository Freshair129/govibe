import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { resolvePathWithinRoot } from "./path-security.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), "govibe-path-security-"));
  roots.push(base);
  const allowed = path.join(base, "allowed");
  const outside = path.join(base, "outside");
  await mkdir(allowed);
  await mkdir(outside);
  await writeFile(path.join(allowed, "roadmap.md"), "approved");
  await writeFile(path.join(outside, "secret.md"), "secret");
  return { allowed, outside };
}

describe("canonical path containment", () => {
  it("accepts relative and absolute paths inside the root", async () => {
    const { allowed } = await fixture();
    const target = path.join(allowed, "roadmap.md");
    await expect(resolvePathWithinRoot("roadmap.md", allowed)).resolves.toBe(target);
    await expect(resolvePathWithinRoot(target, allowed)).resolves.toBe(target);
  });

  it("rejects traversal and absolute paths outside the root", async () => {
    const { allowed, outside } = await fixture();
    await expect(resolvePathWithinRoot("../outside/secret.md", allowed)).rejects.toMatchObject({ code: "PATH_OUTSIDE_ALLOWED_ROOT" });
    await expect(resolvePathWithinRoot(path.join(outside, "secret.md"), allowed)).rejects.toMatchObject({ code: "PATH_OUTSIDE_ALLOWED_ROOT" });
  });

  it("rejects symlink escapes", async ({ skip }) => {
    const { allowed, outside } = await fixture();
    try {
      await symlink(path.join(outside, "secret.md"), path.join(allowed, "escape.md"), process.platform === "win32" ? "file" : undefined);
    } catch (error) {
      if (process.platform === "win32" && error?.code === "EPERM") {
        skip();
        return;
      }
      throw error;
    }
    await expect(resolvePathWithinRoot("escape.md", allowed)).rejects.toMatchObject({ code: "PATH_OUTSIDE_ALLOWED_ROOT" });
  });

  it("distinguishes missing paths and safely resolves missing export leaves", async () => {
    const { allowed } = await fixture();
    await expect(resolvePathWithinRoot("missing.md", allowed)).rejects.toMatchObject({ code: "PATH_NOT_FOUND" });
    await expect(resolvePathWithinRoot("exports/new.md", allowed, { allowMissing: true })).resolves.toBe(path.join(allowed, "exports", "new.md"));
  });
});
