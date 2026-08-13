import { randomUUID } from "node:crypto";

const HEALTH_STATES = new Set(["ready", "unavailable", "degraded", "blocked"]);
const HEALTH_REASONS = new Set([
  "gks_provider_unconfigured",
  "gks_unavailable",
  "storage_unavailable",
  "msp_runtime_unavailable",
  "health_probe_timeout",
  "malformed_health_probe_response",
  "health_probe_failed",
  "reduced_capability",
]);

function evidenceRef(idFactory) {
  return `msp:health/${String(idFactory())}`;
}

function malformedProbe() {
  return { state: "unavailable", reason: "malformed_health_probe_response", malformed: true };
}

function normalizeProbe(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !HEALTH_STATES.has(value.state)) {
    return malformedProbe();
  }

  if (value.state === "ready") {
    return value.reason == null
      ? { state: "ready", reason: null, malformed: false }
      : malformedProbe();
  }

  if (typeof value.reason !== "string" || !HEALTH_REASONS.has(value.reason)) return malformedProbe();
  return { state: value.state, reason: value.reason, malformed: false };
}

async function withTimeout(probe, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(probe),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ state: "unavailable", reason: "health_probe_timeout" }), timeoutMs);
      }),
    ]);
  } catch {
    return { state: "unavailable", reason: "health_probe_failed" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function overallState(components) {
  if (components.msp.state === "blocked") return "blocked";
  if (Object.values(components).some((component) => component.malformed || component.reason === "health_probe_timeout")) {
    return "unavailable";
  }
  if (components.msp.state === "unavailable" || components.storage.state === "unavailable") return "unavailable";
  if (Object.values(components).some((component) => component.state === "degraded" || component.state === "blocked" || component.state === "unavailable")) {
    return "degraded";
  }
  return "ready";
}

function overallReason(state, components) {
  if (state === "ready") return null;
  const priority = [components.msp, components.storage, components.gks];
  return priority.find((component) => component.reason != null)?.reason ?? "msp_runtime_unavailable";
}

function componentStatus(probe, idFactory) {
  const normalized = normalizeProbe(probe);
  return Object.freeze({
    state: normalized.state,
    reason: normalized.reason,
    evidence_ref: evidenceRef(idFactory),
    ...(normalized.malformed ? { malformed: true } : {}),
  });
}

/**
 * Build the MSP-owned health query. The default GKS probe is deliberately a
 * policy result, not a network client: v1 has no configured GKS provider.
 */
export function createHealthHandler({
  db,
  mspProbe = async () => ({ state: "ready" }),
  gksProbe = async () => ({ state: "blocked", reason: "gks_provider_unconfigured" }),
  storageProbe = async () => {
    const row = db.prepare("SELECT 1 AS ok").get();
    if (row?.ok !== 1) return { state: "unavailable", reason: "storage_unavailable" };
    return { state: "ready" };
  },
  timeoutMs = 1_000,
  clock = () => new Date(),
  idFactory = randomUUID,
} = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("createHealthHandler requires a database connection.");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError("health probe timeoutMs must be positive.");
  for (const [name, probe] of Object.entries({ mspProbe, gksProbe, storageProbe })) {
    if (typeof probe !== "function") throw new TypeError(`${name} must be a function.`);
  }

  return async function healthHandler() {
    const [msp, gks, storage] = await Promise.all([
      withTimeout(mspProbe, timeoutMs),
      withTimeout(gksProbe, timeoutMs),
      withTimeout(storageProbe, timeoutMs),
    ]);
    const components = Object.freeze({
      msp: componentStatus(msp, idFactory),
      gks: componentStatus(gks, idFactory),
      storage: componentStatus(storage, idFactory),
    });
    const healthState = overallState(components);
    return Object.freeze({
      schema: "govibe-msp-health/v1",
      health_state: healthState,
      checked_at: clock().toISOString(),
      evidence_ref: evidenceRef(idFactory),
      reason: overallReason(healthState, components),
      components,
    });
  };
}
