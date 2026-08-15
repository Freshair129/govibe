import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertNoLinksWithin, mkdirSafe } from "../path-safety.mjs";

/**
 * Mode 2 owns exactly one directory inside a client workspace. Everything written here is
 * disposable and rebuildable from the source tree; nothing here is canonical knowledge.
 *
 * This module is the only writer in the Mode 2 package. Every other module receives a store
 * and cannot reach the filesystem on its own, which is what makes the metadata-only write
 * policy enforceable rather than merely documented.
 */
export const MODE2_METADATA_ROOT = ".govibe/mode2";

const unsafeSegment = /(^|\/)\.\.(\/|$)/;

export class MetadataWritePolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = "MetadataWritePolicyError";
  }
}

function assertRelativeMetadataPath(relativePath) {
  const value = String(relativePath ?? "");
  if (!value) throw new MetadataWritePolicyError("Metadata path must not be empty.");
  if (path.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value)) {
    throw new MetadataWritePolicyError(`Metadata path must be workspace-relative: ${value}`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (unsafeSegment.test(normalized) || normalized.startsWith("/")) {
    throw new MetadataWritePolicyError(`Metadata path escapes the metadata root: ${value}`);
  }
  if (normalized.split("/").some((segment) => segment.includes(":"))) {
    throw new MetadataWritePolicyError(`Metadata path segment must not contain a colon: ${value}`);
  }
  return normalized;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Json(value) {
  return sha256(JSON.stringify(value));
}

export function createMetadataStore({ workspaceRoot }) {
  const root = path.resolve(workspaceRoot);
  const metadataRoot = path.join(root, ...MODE2_METADATA_ROOT.split("/"));

  async function resolveWritable(relativePath) {
    const normalized = assertRelativeMetadataPath(relativePath);
    const target = path.join(metadataRoot, ...normalized.split("/"));
    const relative = path.relative(metadataRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new MetadataWritePolicyError(`Metadata path escapes the metadata root: ${relativePath}`);
    }
    return { normalized, target };
  }

  return {
    root,
    metadataRoot,
    metadataRootRelative: MODE2_METADATA_ROOT,

    resolve(relativePath) {
      const normalized = assertRelativeMetadataPath(relativePath);
      return path.join(metadataRoot, ...normalized.split("/"));
    },

    async ensureDirectory(relativePath = ".") {
      if (relativePath === ".") {
        await mkdirSafe(root, metadataRoot);
        return metadataRoot;
      }
      const { target } = await resolveWritable(relativePath);
      await mkdirSafe(root, target);
      return target;
    },

    async writeJson(relativePath, value) {
      const { target } = await resolveWritable(relativePath);
      await mkdirSafe(root, path.dirname(target));
      await assertNoLinksWithin(root, target);
      await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      return target;
    },

    async readJson(relativePath) {
      const { target } = await resolveWritable(relativePath);
      try {
        return JSON.parse(await readFile(target, "utf8"));
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    },
  };
}
