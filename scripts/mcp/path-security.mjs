import { realpath } from "node:fs/promises";
import path from "node:path";

function comparablePath(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export async function resolvePathWithinRoot(inputPath, rootPath, options = {}) {
  if (typeof inputPath !== "string" || inputPath.trim() === "") {
    throw new TypeError("inputPath must be a non-empty string.");
  }
  if (typeof rootPath !== "string" || !path.isAbsolute(rootPath)) {
    throw new TypeError("rootPath must be an absolute path.");
  }

  const candidate = path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(rootPath, inputPath);

  const [resolvedRoot, resolvedCandidate] = await Promise.all([
    realpath(path.normalize(rootPath)),
    realpath(candidate),
  ]);

  const rootKey = comparablePath(resolvedRoot);
  const candidateKey = comparablePath(resolvedCandidate);
  const relative = path.relative(rootKey, candidateKey);
  const contained = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));

  if (!contained) {
    const error = new Error(options.message ?? "Path is outside the configured allowed root.");
    error.code = "PATH_OUTSIDE_ALLOWED_ROOT";
    throw error;
  }

  return resolvedCandidate;
}

export async function resolvePathWithinAnyRoot(inputPath, rootPaths, options = {}) {
  if (!Array.isArray(rootPaths) || rootPaths.length === 0) {
    throw new TypeError("rootPaths must be a non-empty array of absolute paths.");
  }

  const failures = [];
  for (const rootPath of rootPaths) {
    try {
      return await resolvePathWithinRoot(inputPath, rootPath, options);
    } catch (error) {
      if (error?.code !== "PATH_OUTSIDE_ALLOWED_ROOT") throw error;
      failures.push(error);
    }
  }

  const error = new Error(options.message ?? "Path is outside all configured allowed roots.");
  error.code = "PATH_OUTSIDE_ALLOWED_ROOT";
  error.cause = failures.at(-1);
  throw error;
}
