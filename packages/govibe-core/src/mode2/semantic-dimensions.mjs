/**
 * The semantic dimensions Phase 1 must reason about, and which stage can supply each.
 *
 * The important property of this table is what it shows *missing*: seven dimensions have no
 * bottom-up producer at all. Intent, requirement, rationale, domain, deployment, authority,
 * and change are recoverable only from top-down artefacts. A coverage report built on this
 * table therefore reports honest gaps for an undocumented repository instead of scoring it as
 * complete because its code parsed cleanly.
 */

export const SEMANTIC_DIMENSIONS = [
  "intent",
  "requirement",
  "rationale",
  "domain",
  "structure",
  "data",
  "behavior",
  "state",
  "decision",
  "interface",
  "dependency",
  "security",
  "runtime",
  "deployment",
  "verification",
  "evidence",
  "authority",
  "provenance",
  "agent_capability",
  "agent_governance",
  "operations",
  "change",
];

/** Which Mode 2 stage produces atoms for a dimension. Empty array = no bottom-up producer. */
export const DIMENSION_PRODUCERS = Object.freeze({
  intent: [],
  requirement: [],
  rationale: [],
  domain: [],
  structure: [1, 2, 3],
  data: [6],
  behavior: [7],
  state: [8],
  decision: [8],
  interface: [5],
  dependency: [4],
  security: [9],
  runtime: [1],
  deployment: [],
  verification: [10],
  evidence: [10],
  authority: [],
  provenance: [12],
  agent_capability: [11],
  agent_governance: [11],
  operations: [9],
  change: [],
});

/** Dimensions no bottom-up stage can supply. Recoverable only from the top-down intent pass. */
export const TOP_DOWN_ONLY_DIMENSIONS = Object.freeze(
  SEMANTIC_DIMENSIONS.filter((dimension) => DIMENSION_PRODUCERS[dimension].length === 0),
);

/**
 * Block Profiles. Not every project needs every dimension, so coverage is evaluated against a
 * profile rather than against the full list — the specification is explicit that document
 * count is not semantic completeness, and neither is dimension count.
 */
export const BLOCK_PROFILES = Object.freeze({
  "service-minimal": {
    description: "A single deployable service with no governed documentation obligation",
    required: ["structure", "interface", "dependency", "behavior", "verification"],
  },
  "service-governed": {
    description: "A service under a documentation and verification regime",
    required: [
      "intent", "requirement", "structure", "data", "behavior", "interface",
      "dependency", "security", "verification", "evidence",
    ],
  },
  "agentic-system": {
    description: "A repository that carries its own agent execution or governance system",
    required: [
      "intent", "requirement", "structure", "behavior", "interface", "dependency",
      "verification", "agent_capability", "agent_governance", "authority", "provenance",
    ],
  },
  "platform-governed": {
    description: "A governed platform: every dimension is in scope",
    required: [...SEMANTIC_DIMENSIONS],
  },
});

export const DEFAULT_BLOCK_PROFILE = "service-minimal";

/**
 * Profile selection is signal-driven and reports why it chose. Guessing a stricter profile
 * would manufacture gaps; guessing a looser one would hide them, so the choice is evidence-
 * backed and overridable by the caller.
 */
export function selectBlockProfile({ agentManifest, documentationRoots = [], governedDocCount = 0 }) {
  if (agentManifest?.agentic_system_detected) {
    return { profile: "agentic-system", reason: "stage 11 detected an external agent system" };
  }
  if (governedDocCount >= 20) {
    return { profile: "service-governed", reason: `${governedDocCount} documents carry governance frontmatter` };
  }
  if (documentationRoots.length) {
    return { profile: "service-governed", reason: `documentation root present: ${documentationRoots.join(", ")}` };
  }
  return { profile: DEFAULT_BLOCK_PROFILE, reason: "no documentation or agentic signal detected" };
}
