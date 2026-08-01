import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256Json } from "./context-lineage.mjs";

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,191}$/;

function safeId(value, label) {
  if (typeof value !== "string" || !SAFE_ID.test(value) || value.includes("..")) {
    throw new TypeError(`${label} must be a safe identifier.`);
  }
  return value;
}

function assertProvider(provider) {
  if (!provider || typeof provider.put !== "function" || typeof provider.get !== "function") {
    throw new TypeError("Replay provider must implement put(key, value) and get(key).");
  }
  return provider;
}

export function createFileReplayProvider({ rootPath }) {
  if (typeof rootPath !== "string" || !rootPath.trim()) throw new TypeError("Replay provider rootPath is required.");
  const root = path.resolve(rootPath);

  const targetFor = (key) => path.join(root, `${safeId(key, "key")}.json`);

  return {
    kind: "file",
    async put(key, value) {
      await mkdir(root, { recursive: true });
      const target = targetFor(key);
      const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
      await rename(temporary, target);
      return { key, durable: true };
    },
    async get(key) {
      try {
        return JSON.parse(await readFile(targetFor(key), "utf8"));
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    },
  };
}

export async function persistReplayBundle({ provider, packet, injectionRecord, model, toolContractHash, kvPayload = null }) {
  assertProvider(provider);
  if (!packet?.contextId || !packet?.cacheId || !packet?.contextHash) throw new TypeError("A materialized context packet is required.");
  if (!injectionRecord?.injection_id) throw new TypeError("A context injection record is required.");
  if (typeof model !== "string" || !model) throw new TypeError("Replay model is required.");
  if (typeof toolContractHash !== "string" || !/^[a-f0-9]{64}$/i.test(toolContractHash)) throw new TypeError("toolContractHash must be SHA-256.");

  const replayId = safeId(`replay_${packet.contextId}`, "replayId");
  const payloadHash = kvPayload === null ? null : sha256Json(kvPayload);
  const bundle = {
    schema: "govibe-replay-bundle/v1",
    replay_id: replayId,
    context_id: packet.contextId,
    cache_id: packet.cacheId,
    context_hash: packet.contextHash,
    source_manifest_hash: packet.sourceManifestHash,
    injection_id: injectionRecord.injection_id,
    model,
    tool_contract_hash: toolContractHash.toLowerCase(),
    kv: kvPayload === null ? null : { payload_hash: payloadHash, payload: kvPayload },
    created_at: new Date().toISOString(),
  };
  bundle.bundle_hash = sha256Json(bundle);
  await provider.put(replayId, bundle);
  return bundle;
}

export async function loadReplayBundle({ provider, replayId, expected = {} }) {
  assertProvider(provider);
  const bundle = await provider.get(safeId(replayId, "replayId"));
  if (!bundle) throw new Error("Replay bundle not found.");
  if (bundle.schema !== "govibe-replay-bundle/v1") throw new Error("Invalid replay bundle schema.");
  const { bundle_hash: bundleHash, ...unsigned } = bundle;
  if (sha256Json(unsigned) !== bundleHash) throw new Error("Replay bundle integrity check failed.");
  if (expected.contextHash && bundle.context_hash !== expected.contextHash) throw new Error("Replay context hash mismatch.");
  if (expected.sourceManifestHash && bundle.source_manifest_hash !== expected.sourceManifestHash) throw new Error("Replay source manifest mismatch.");
  if (expected.model && bundle.model !== expected.model) throw new Error("Replay model mismatch.");
  if (expected.toolContractHash && bundle.tool_contract_hash !== expected.toolContractHash.toLowerCase()) throw new Error("Replay tool contract mismatch.");
  if (bundle.kv && sha256Json(bundle.kv.payload) !== bundle.kv.payload_hash) throw new Error("Replay KV payload integrity check failed.");
  return bundle;
}

export async function restoreReplayContext({ provider, replayId, expected = {}, inject }) {
  if (typeof inject !== "function") throw new TypeError("Replay inject callback is required.");
  const bundle = await loadReplayBundle({ provider, replayId, expected });
  const result = await inject({
    contextId: bundle.context_id,
    cacheId: bundle.cache_id,
    kvPayload: bundle.kv?.payload ?? null,
    model: bundle.model,
    toolContractHash: bundle.tool_contract_hash,
  });
  return { replayId: bundle.replay_id, bundleHash: bundle.bundle_hash, restored: true, result };
}
