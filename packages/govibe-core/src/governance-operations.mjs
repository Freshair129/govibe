import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist']);

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory() && !EXCLUDED_DIRECTORIES.has(entry.name)) await walk(fullPath);
      if (entry.isFile()) files.push(fullPath);
    }
  }
  await walk(root);
  return files;
}

function inside(root, requested) {
  const target = path.resolve(root, requested);
  const relative = path.relative(path.resolve(root), target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path escapes workspace.');
  return target;
}

export async function reviewWorkspace({ workspacePath }) {
  return { schema: 'govibe-review/v1', mode: 'read_only', filesInspected: (await listFiles(workspacePath)).length, findings: [] };
}

export async function workspaceImpact({ workspacePath, paths }) {
  const needles = paths.map((item) => item.replaceAll('\\', '/'));
  const references = [];
  for (const fullPath of await listFiles(workspacePath)) {
    if (!/\.(md|mjs|js|ts|tsx|json)$/i.test(fullPath)) continue;
    const text = await readFile(fullPath, 'utf8').catch(() => '');
    if (needles.some((needle) => text.includes(needle))) references.push(path.relative(workspacePath, fullPath).replaceAll('\\', '/'));
  }
  return { schema: 'govibe-impact/v1', paths: needles, references: references.sort() };
}

export async function docsVersion({ workspacePath, path: requestedPath }) {
  const text = await readFile(inside(workspacePath, requestedPath), 'utf8');
  const version = text.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] ?? null;
  return { schema: 'govibe-doc-version/v1', path: requestedPath, version };
}

export async function optimizeMeasured({ measureBefore, optimize, measureAfter }) {
  const before = await measureBefore();
  await optimize();
  const after = await measureAfter();
  if (!Number.isFinite(before) || !Number.isFinite(after)) throw new Error('Optimize measurements must be finite numbers.');
  return { schema: 'govibe-optimize/v1', before, after, delta: after - before };
}
