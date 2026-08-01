import { parse } from "yaml";

const accents = ["#10b981", "#6366f1", "#22d3ee", "#f472b6", "#f59e0b", "#a78bfa"];

function stringList(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`Agent registry ${field} must be a string array.`);
  return value;
}

export function parseAgentRegistry(text) {
  let document;
  try { document = parse(text); }
  catch { throw new Error("Agent registry contains invalid YAML."); }
  if (!document || typeof document !== "object" || !document.agents || typeof document.agents !== "object" || Array.isArray(document.agents)) {
    throw new Error("Agent registry must contain an agents mapping.");
  }

  return Object.entries(document.agents).map(([id, value], index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Agent registry entries must be mappings.");
    const authority = value.authority ?? {};
    const policy = value.execution_policy ?? {};
    return {
      id,
      name: typeof value.label === "string" ? value.label : id.toUpperCase(),
      role: typeof value.role === "string" ? value.role : "Unspecified",
      model: "Registry-defined",
      status: "registered",
      tasks: "unavailable",
      accuracy: "unavailable",
      speed: "unavailable",
      defaultExecutor: policy.default_executor,
      defaultMode: policy.default_mode,
      modelTier: policy.local_model_tier,
      accent: accents[index % accents.length],
      fleet: {
        fleetRole: value.role,
        jobTitleEquivalent: value.job_title_equivalent,
        domain: value.domain,
        cluster: value.cluster,
        responsibility: stringList(value.responsibility, `${id}.responsibility`),
        authority: { can: stringList(authority.can, `${id}.authority.can`), cannot: stringList(authority.cannot, `${id}.authority.cannot`) },
        sourceRefs: stringList(value.source_refs, `${id}.source_refs`),
        approvalGate: "Registry metadata only; execution requires assignment and approval.",
        scopeBoundary: "Defined by agent-registry.yaml execution policy.",
        scopeStatus: "ready_for_assignment",
      },
    };
  });
}
