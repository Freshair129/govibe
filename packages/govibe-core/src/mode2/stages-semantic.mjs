import { byCodepoint, sortById } from "./stage-shared.mjs";
import { DIMENSION_PRODUCERS, TOP_DOWN_ONLY_DIMENSIONS } from "./semantic-dimensions.mjs";

/**
 * Stage 12 — Semantic Reconstruction
 *
 * Composes stages 1–11 into the Candidate Semantic IR. This stage *composes*; it never
 * extracts. Anything that would discover new meaning belongs in a stage that owns that
 * dimension, which is the same principle that keeps F1–F4 out of the stage axis.
 *
 * Every atom carries the full provenance envelope the architecture requires, and every
 * identity is pipeline-local. **No scanner may mint canonical GKS identities** — promotion to
 * canonical truth flows only through MSP, which happens in F4, not here.
 */

const ATOM_SCHEMA = "govibe-mode2-candidate-atom/v1";
const RELATION_SCHEMA = "govibe-mode2-candidate-relation/v1";

/**
 * How each stage's artifact contributes atoms. Keeping this declarative means adding a stage
 * later is a table entry, not a rewrite, and it makes the dimension mapping auditable in one
 * place rather than scattered through composition code.
 */
const ATOM_SOURCES = [
  {
    stage: 1,
    dimension: "runtime",
    type: "workspace",
    select: (artifact) => (artifact ? [{ key: "workspace", value: artifact }] : []),
    toAtom: ({ artifact }) => ({
      identity: "mode2-atom:workspace",
      type: "workspace-manifest",
      source: null,
      explicit: true,
      properties: {
        languages: Object.keys(artifact.languages ?? {}).length,
        package_managers: artifact.package_managers?.map((item) => item.name) ?? [],
        build_systems: artifact.build_systems?.map((item) => item.name) ?? [],
        frameworks: artifact.frameworks?.map((item) => item.name) ?? [],
        monorepo: artifact.monorepo?.detected ?? false,
      },
    }),
  },
  {
    stage: 3,
    dimension: "structure",
    type: "symbol",
    select: (artifact) => (artifact?.symbols ?? []).map((symbol) => ({ key: symbol.id, value: symbol })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `symbol:${value.kind}`,
      source: value.path,
      source_span: value.source_span,
      explicit: true,
      properties: { name: value.name, exported: value.exported },
    }),
  },
  {
    stage: 5,
    dimension: "interface",
    type: "interface",
    select: (artifact) => (artifact?.interfaces ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `interface:${value.kind}`,
      source: value.path,
      source_span: value.source_span,
      explicit: value.parsed !== false,
      properties: { method: value.method, route: value.route, channel: value.channel, host: value.host, name: value.name },
    }),
  },
  {
    stage: 6,
    dimension: "data",
    type: "entity",
    select: (artifact) => (artifact?.entities ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: "data-entity",
      source: value.path,
      explicit: true,
      properties: { name: value.name, origin: value.source, field_count: value.fields?.length ?? 0 },
    }),
  },
  {
    stage: 7,
    dimension: "behavior",
    type: "entrypoint",
    select: (artifact) => (artifact?.entrypoints ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `entrypoint:${value.kind}`,
      source: value.path,
      explicit: true,
      properties: { name: value.name, target: value.target, command: value.command },
    }),
  },
  {
    stage: 8,
    dimension: "state",
    type: "state-shape",
    select: (artifact) => (artifact?.state_shapes ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `state:${value.form}`,
      source: value.path,
      source_span: value.source_span,
      explicit: true,
      properties: { name: value.name, values: value.values },
    }),
  },
  {
    stage: 8,
    dimension: "decision",
    type: "transition",
    select: (artifact) => (artifact?.transitions ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: "state-transition",
      source: value.path,
      source_span: value.source_span,
      // A discriminant switch is observed structure, not a confirmed business decision.
      explicit: false,
      confidence: 0.6,
      properties: { discriminant: value.discriminant, labels: value.labels },
    }),
  },
  {
    stage: 9,
    dimension: "security",
    type: "concern",
    select: (artifact) =>
      (artifact?.observations ?? [])
        .filter((item) => ["authentication", "authorization", "audit", "rate_limiting"].includes(item.concern))
        .map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `security-concern:${value.concern}`,
      source: value.path,
      explicit: true,
      confidence: 0.5,
      properties: { concern: value.concern, evidence: value.evidence },
    }),
  },
  {
    stage: 9,
    dimension: "operations",
    type: "concern",
    select: (artifact) =>
      (artifact?.observations ?? [])
        .filter((item) => !["authentication", "authorization", "audit", "rate_limiting"].includes(item.concern))
        .map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `operations-concern:${value.concern}`,
      source: value.path,
      explicit: true,
      confidence: 0.5,
      properties: { concern: value.concern, evidence: value.evidence },
    }),
  },
  {
    stage: 10,
    dimension: "verification",
    type: "test",
    select: (artifact) => (artifact?.tests ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: "test",
      source: value.path,
      explicit: true,
      properties: {},
    }),
  },
  {
    stage: 10,
    dimension: "evidence",
    type: "gate",
    select: (artifact) => (artifact?.gates ?? []).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `gate:${value.kind}`,
      source: value.path,
      explicit: true,
      properties: { script: value.script },
    }),
  },
  {
    stage: 11,
    dimension: "agent_capability",
    type: "agent-capability",
    select: (artifact) => (artifact?.capabilities ?? []).map((item) => ({ key: `capability:${item.axis}`, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:agent-capability:${value.axis}`,
      type: "agent-capability",
      source: null,
      explicit: value.classification === "NATIVE" || value.classification === "HYBRID",
      properties: { axis: value.axis, classification: value.classification, evidence: value.external_evidence },
    }),
  },
  {
    stage: 11,
    dimension: "agent_governance",
    type: "agent-governor",
    select: (artifact) => (artifact?.instructions ?? []).filter((item) => item.exists).map((item) => ({ key: item.id, value: item })),
    toAtom: ({ value }) => ({
      identity: `mode2-atom:${value.id}`,
      type: `agent-instruction:${value.kind}`,
      source: value.path,
      explicit: true,
      properties: { client: value.client, bytes: value.bytes },
    }),
  },
];

const RELATION_SOURCES = [
  { stage: 4, key: "edges", dimension: "dependency" },
  { stage: 6, key: "relations", dimension: "data" },
  { stage: 10, key: "inferred_links", dimension: "verification" },
];

const stage12 = {
  stage: 12,
  extractorVersion: "1.0.0",
  method: "candidate-semantic-ir-composition",
  usesTreeShape: false,
  // Stage 12 reads no files. Its inputs are the artifacts of stages 1-11, so a change that
  // does not alter any upstream artifact must not re-run it.
  inputs: () => [],
  async run({ artifacts, stageRecords = [] }) {
    const atoms = [];
    const relations = [];
    const unresolved = [];
    const seen = new Set();

    for (const source of ATOM_SOURCES) {
      const artifact = artifacts.get(source.stage);
      if (!artifact) continue;
      for (const item of source.select(artifact)) {
        const built = source.toAtom({ ...item, artifact });
        if (seen.has(built.identity)) continue;
        seen.add(built.identity);
        atoms.push({
          schema: ATOM_SCHEMA,
          identity: built.identity,
          type: built.type,
          dimension: source.dimension,
          source: built.source ?? null,
          source_span: built.source_span ?? null,
          provenance: { stage: source.stage, extractor: source.type, extractor_version: "1.0.0" },
          confidence: built.confidence ?? 1,
          scope: built.source ? "file" : "workspace",
          inferred: built.explicit === false,
          explicit: built.explicit !== false,
          properties: built.properties ?? {},
          canonical: false,
        });
      }
    }

    for (const source of RELATION_SOURCES) {
      const artifact = artifacts.get(source.stage);
      for (const edge of artifact?.[source.key] ?? []) {
        relations.push({
          schema: RELATION_SCHEMA,
          identity: `mode2-relation:${edge.id}`,
          rel: edge.rel,
          from: edge.from,
          to: edge.to,
          dimension: source.dimension,
          provenance: { stage: source.stage, extractor: source.key, extractor_version: "1.0.0" },
          confidence: edge.confidence ?? (edge.inferred ? 0.5 : 1),
          inferred: Boolean(edge.inferred),
          explicit: edge.explicit === true,
          kind: edge.kind ?? null,
          canonical: false,
        });
      }
    }

    // Explicit annotation links are the highest-grade relations available, so they are
    // composed separately and never collapsed into the inferred set.
    for (const link of artifacts.get(10)?.annotations?.explicit_links ?? []) {
      relations.push({
        schema: RELATION_SCHEMA,
        identity: `mode2-relation:${link.id}`,
        rel: link.rel,
        from: link.from,
        to: link.to,
        dimension: "verification",
        provenance: { stage: 10, extractor: "annotation", extractor_version: "1.0.0" },
        confidence: 1,
        inferred: false,
        explicit: true,
        kind: "annotation",
        canonical: false,
      });
    }

    // Unresolved meaning is carried forward, never discarded on composition.
    for (const record of stageRecords) {
      for (const item of record.unresolved ?? []) {
        unresolved.push({ stage: record.stage, ...item });
      }
    }
    for (const dimension of TOP_DOWN_ONLY_DIMENSIONS) {
      unresolved.push({
        stage: 12,
        kind: "dimension-has-no-bottom-up-producer",
        dimension,
        detail: "recoverable only from the top-down intent pass; absent from the bottom-up model by construction",
      });
    }

    const byDimension = {};
    for (const atom of atoms) byDimension[atom.dimension] = (byDimension[atom.dimension] ?? 0) + 1;

    return {
      status: "complete",
      confidence: atoms.length === 0 ? 0 : Number((atoms.filter((atom) => atom.explicit).length / atoms.length).toFixed(4)),
      unresolved: unresolved.slice(0, 500),
      artifact: {
        schema: "govibe-mode2-candidate-semantic-ir/v1",
        // Every identity here is pipeline-local. GKS assigns canonical identity after MSP
        // authorizes promotion; nothing in this artifact is canonical.
        canonical: false,
        identity_namespace: "mode2-atom / mode2-relation (pipeline-local)",
        atoms: sortById(atoms.map((atom) => ({ ...atom, id: atom.identity }))).map(({ id, ...atom }) => atom),
        relations: sortById(relations.map((relation) => ({ ...relation, id: relation.identity }))).map(({ id, ...relation }) => relation),
        dimension_counts: Object.fromEntries(Object.entries(byDimension).sort(([left], [right]) => byCodepoint(left, right))),
        dimensions_without_producer: [...TOP_DOWN_ONLY_DIMENSIONS],
        producer_map: DIMENSION_PRODUCERS,
        unresolved_total: unresolved.length,
      },
    };
  },
};

export const semanticStages = [stage12];
