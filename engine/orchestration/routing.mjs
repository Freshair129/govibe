// Per-language local model routing (TASK-HYB-RM-007). Pick the on-device coder model best suited to
// the target repo's primary language from config, falling back to a general default. Pure +
// deterministic. Cross-platform by construction (plain Node; no OS-specific paths here).

const ALIASES = { ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", py: "python", rs: "rust", golang: "go" };

// Normalize a stack/language hint (e.g. "Rust (Cargo)", "Node:foo", "React") to a canonical key.
export function normalizeLang(s) {
  const l = String(s || "").toLowerCase();
  if (/rust|cargo/.test(l)) return "rust";
  if (/python|pyproject|requirements|\bpy\b/.test(l)) return "python";
  if (/\bgo\b|golang/.test(l)) return "go";
  if (/typescript|react|tsx|\bts\b/.test(l)) return "typescript";
  if (/javascript|node|\bjs\b/.test(l)) return "javascript";
  const first = l.split(/[\s,(/:]+/).filter(Boolean)[0] || "";
  return ALIASES[first] || first || "default";
}

// Detect the primary language from a summarizeRepo() stack string (first recognized language wins).
export function detectPrimaryLang(repoSummary) {
  const stackLine = String(repoSummary || "").split("\n").find((l) => /stack:/i.test(l)) || String(repoSummary || "");
  for (const cand of ["rust", "python", "go", "typescript", "javascript"]) {
    if (normalizeLang(stackLine) === cand) return cand;
    if (new RegExp(cand === "go" ? "\\bgo\\b|golang" : cand, "i").test(stackLine)) {
      const n = normalizeLang(cand); if (n !== "default") return n;
    }
  }
  return normalizeLang(stackLine);
}

// Pick the configured local model for a language; fall back to default; null if unconfigured.
export function pickLocalModel(lang, config = {}) {
  const map = config.localModelByLang || {};
  return map[normalizeLang(lang)] || map.default || null;
}
