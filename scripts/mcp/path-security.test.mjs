import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolvePathWithinAnyRoot, resolvePathWithinRoot } from "./path-security.mjs";

async function fixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), "govibe-path-security-"));
  const allowed = path.join(base, "allowed");
  const outside = path.join(base, "outside");
  await mkdir(allowed);
  await mkdir(outside);
  await writeFile(path.join(allowed, "roadmap.md"), "approved");
  await writeFile(path.join(outside, "secret.md"), "secret");
  return { base, allowed, outside };
}

test("accepts a relative path inside the allowed root", async () => {
  const { allowed } = await fixture();
  const resolved = await resolvePathWithinRoot("roadmap.md", allowed);
  assert.equal(resolved, path.join(allowed, "roadmap.md"));
});

test("accepts an absolute path inside the allowed root", async () => {
  const { allowed } = await fixture();
  const target = path.join(allowed, "roadmap.md");
  assert.equal(await resolvePathWithinRoot(target, allowed), target);
});

test("rejects parent traversal outside the allowed root", async () => {
  const { allowed } = await fixture();
  await assert.rejects(
    resolvePathWithinRoot("../outside/secret.md", allowed),
    (error) => error.code === "PATH_OUTSIDE_ALLOWED_ROOT",
  );
});

test("rejects an absolute path outside the allowed root", async () => {
  const { allowed, outside } = await fixture();
  await assert.rejects(
    resolvePathWithinRoot(path.join(outside, "secret.md"), allowed),
    (error) => error.code === "PATH_OUTSIDE_ALLOWED_ROOT",
  );
});

test("rejects a symlink escape", async (t) => {
  const { allowed, outside } = await fixture();
  const link = path.join(allowed, "escape.md");
  try {
    await symlink(path.join(outside, "secret.md"), link, process.platform === "win32" ? "file" : undefined);
  } catch (error) {
    if (process.platform === "win32" && error?.code === "EPERM") {
      t.skip("Symlink creation requires additional Windows privileges.");
      return;
    }
    throw error;
  }
  await assert.rejects(
    resolvePathWithinRoot("escape.md", allowed),
    (error) => error.code === "PATH_OUTSIDE_ALLOWED_ROOT",
  );
});

test("accepts a target contained by any configured root", async () => {
  const { allowed, outside } = await fixture();
  const target = path.join(outside, "secret.md");
  assert.equal(await resolvePathWithinAnyRoot(target, [allowed, outside]), target);
});
