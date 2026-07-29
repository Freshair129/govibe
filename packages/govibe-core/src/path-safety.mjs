import { lstat, mkdir } from "node:fs/promises";
import path from "node:path";

async function assertNotLink(target) {
  try {
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw new Error(`Symbolic link or junction is not allowed in a runtime path: ${target}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function assertNoLinksWithin(root, target) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Runtime path escapes its root: ${absoluteTarget}`);
  await assertNotLink(absoluteRoot);
  let current = absoluteRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    await assertNotLink(current);
  }
}

export async function mkdirSafe(root, target) {
  await assertNoLinksWithin(root, target);
  await mkdir(target, { recursive: true });
  await assertNoLinksWithin(root, target);
}
