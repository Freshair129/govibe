import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { mkdirSafe } from "./path-safety.mjs";
import { sha256Json } from "./context-lineage.mjs";

function assertSafeId(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,191}$/.test(value) || value.includes("..")) {
    throw new TypeError(`${label} must be a safe identifier.`);
  }
  return value;
}

export async function persistContextInjection({ workspacePath, packet, agentId, runId, turnId, sessionId = null, diffRef = null }) {
  if (!packet?.contextId || !packet?.cacheId || !packet?.contextHash) throw new TypeError("A materialized context packet with lineage is required.");
  const root = path.resolve(workspacePath);
  const contextId = assertSafeId(packet.contextId, "contextId");
  const cacheId = assertSafeId(packet.cacheId, "cacheId");
  const contextsDir = path.join(root, ".govibe", "contexts");
  const injectionsDir = path.join(root, ".govibe", "context-injections");
  await Promise.all([mkdirSafe(root, contextsDir), mkdirSafe(root, injectionsDir)]);

  const packetHash = sha256Json(packet);
  const cachePath = path.join(contextsDir, `${cacheId}.json`);
  const injectionId = `inject_${randomUUID()}`;
  const injectionPath = path.join(injectionsDir, `${injectionId}.json`);
  const record = {
    schema: "govibe-context-injection/v1",
    injection_id: injectionId,
    context_id: contextId,
    cache_id: cacheId,
    kv_id: packet.kvId ?? null,
    parent_context_id: packet.parentContextId ?? null,
    agent_id: assertSafeId(agentId, "agentId"),
    project_id: packet.projectId ?? null,
    workspace_id: packet.workspaceId,
    session_id: sessionId,
    run_id: assertSafeId(runId, "runId"),
    turn_id: assertSafeId(turnId, "turnId"),
    context_profile: packet.contextProfile,
    injected_at: new Date().toISOString(),
    source_manifest_hash: packet.sourceManifestHash,
    context_hash: packet.contextHash,
    packet_hash: packetHash,
    cache_path: path.relative(root, cachePath).replaceAll("\\", "/"),
    diff_ref: diffRef,
    replay: { replayable: true, requires_same_model: Boolean(packet.kvId), requires_same_tool_contracts: true },
  };

  await writeFile(cachePath, `${JSON.stringify({ schema: "govibe-context-cache/v1", cache_id: cacheId, context_id: contextId, packet_hash: packetHash, packet }, null, 2)}\n`, { flag: "wx" });
  await writeFile(injectionPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  return { record, cachePath, injectionPath };
}

export async function loadContextCache({ workspacePath, cacheId }) {
  const root = path.resolve(workspacePath);
  const safeCacheId = assertSafeId(cacheId, "cacheId");
  const value = JSON.parse(await readFile(path.join(root, ".govibe", "contexts", `${safeCacheId}.json`), "utf8"));
  if (value.schema !== "govibe-context-cache/v1" || value.cache_id !== safeCacheId) throw new Error("Invalid context cache record.");
  if (sha256Json(value.packet) !== value.packet_hash) throw new Error("Context cache integrity check failed.");
  return value;
}
