import { realpath } from "node:fs/promises";
import path from "node:path";

function pathKey(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function pathError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function canonicalCandidate(candidate, allowMissing) {
  try {
    return await realpath(candidate);
  } catch (error) {
    if (error?.code !== "ENOENT" || !allowMissing) {
      if (error?.code === "ENOENT") throw pathError("PATH_NOT_FOUND", "Requested path does not exist within an allowed root.");
      throw error;
    }
  }

  const suffix = [];
  let ancestor = candidate;
  while (true) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw pathError("PATH_NOT_FOUND", "Requested path has no existing allowed ancestor.");
    suffix.unshift(path.basename(ancestor));
    ancestor = parent;
    try {
      return path.join(await realpath(ancestor), ...suffix);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export async function resolvePathWithinRoot(inputPath, rootPath, options = {}) {
  if (typeof inputPath !== "string" || inputPath.trim() === "") throw new TypeError("inputPath must be a non-empty string.");
  if (typeof rootPath !== "string" || !path.isAbsolute(rootPath)) throw new TypeError("rootPath must be an absolute path.");

  const resolvedRoot = await realpath(path.normalize(rootPath));
  const candidate = path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(options.basePath ?? resolvedRoot, inputPath);
  const lexicalRelative = path.relative(pathKey(resolvedRoot), pathKey(candidate));
  if (lexicalRelative.startsWith("..") || path.isAbsolute(lexicalRelative)) {
    throw pathError("PATH_OUTSIDE_ALLOWED_ROOT", "Requested path is outside configured allowed roots.");
  }
  const resolvedCandidate = await canonicalCandidate(candidate, options.allowMissing === true);
  const relative = path.relative(pathKey(resolvedRoot), pathKey(resolvedCandidate));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw pathError("PATH_OUTSIDE_ALLOWED_ROOT", "Requested path is outside configured allowed roots.");
  }
  return resolvedCandidate;
}

export async function resolvePathWithinAnyRoot(inputPath, rootPaths, options = {}) {
  if (!Array.isArray(rootPaths) || rootPaths.length === 0) throw new TypeError("rootPaths must be a non-empty array.");
  let missing;
  for (const rootPath of rootPaths) {
    try {
      return await resolvePathWithinRoot(inputPath, rootPath, options);
    } catch (error) {
      if (error?.code === "PATH_NOT_FOUND") missing = error;
      else if (error?.code !== "PATH_OUTSIDE_ALLOWED_ROOT") throw error;
    }
  }
  if (missing) throw missing;
  throw pathError("PATH_OUTSIDE_ALLOWED_ROOT", "Requested path is outside configured allowed roots.");
}
