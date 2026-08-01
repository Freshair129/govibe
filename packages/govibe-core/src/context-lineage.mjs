import { createHash, randomUUID } from "node:crypto";

export const CONTEXT_PROFILES = Object.freeze(["T-ctx", "V-ctx", "W-ctx", "M-ctx"]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Json(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function validateContextProfile(profile) {
  if (!CONTEXT_PROFILES.includes(profile)) {
    throw new TypeError(`Invalid context profile: ${profile}`);
  }
  return profile;
}

export function createContextLineage({ profile = "T-ctx", sources = {}, policy = {}, parentContextId = null, kvId = null } = {}) {
  validateContextProfile(profile);
  const sourceManifestHash = sha256Json(sources);
  const contextHash = sha256Json({ profile, sources, policy, parentContextId });
  return {
    contextId: `ctx_${contextHash.slice(0, 24)}`,
    cacheId: `cache_${randomUUID()}`,
    kvId,
    parentContextId,
    sourceManifestHash,
    contextHash,
    contextProfile: profile,
  };
}

export function bindRuntimeKv(lineage, kvId) {
  if (!lineage?.cacheId) throw new TypeError("Context lineage with cacheId is required.");
  if (typeof kvId !== "string" || !kvId) throw new TypeError("kvId is required.");
  return { ...lineage, kvId };
}
