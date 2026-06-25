// Onboarding preflight (TASK-HYB-RM-006). Probe readiness — Ollama reachable? a local coder model
// pulled? a frontier provider enabled? — and produce clear, actionable guidance. Degrades
// gracefully (never throws); the run still works on whatever is available. The summarizer is pure
// and unit-tested; the live probe injects its checks so it stays testable.

export function summarizePreflight(state = {}) {
  const issues = [];
  const localOk = state.ollama && (state.localModels || []).length > 0;
  if (!state.ollama) {
    issues.push("Ollama not reachable — install from https://ollama.com and start it; otherwise execution falls back to the frontier model (paid, not on-device).");
  } else if (!(state.localModels || []).length) {
    issues.push("No local model pulled — run `ollama pull qwen3` (or your preferred coder model) to execute on-device at $0.");
  }
  if (!state.frontier) {
    issues.push("No frontier provider enabled — planning and the L2 review tier need one (e.g. the `claude` CLI on PATH, or set an API key in config).");
  }
  return {
    ollama: !!state.ollama,
    localModels: state.localModels || [],
    frontier: !!state.frontier,
    localOk,
    ready: !!(localOk && state.frontier),
    canRunDegraded: !!state.frontier,        // frontier alone can still plan + execute + review (paid)
    issues,
  };
}

// deps (injected for testability): { ollamaTags: async () => string[], frontierEnabled: () => bool }
export async function probeReadiness(config = {}, deps = {}) {
  let ollama = false, localModels = [];
  try { localModels = (await deps.ollamaTags?.(config)) || []; ollama = true; }
  catch { ollama = false; }
  let frontier = false;
  try { frontier = !!deps.frontierEnabled?.(config); } catch { frontier = false; }
  return summarizePreflight({ ollama, localModels, frontier });
}
