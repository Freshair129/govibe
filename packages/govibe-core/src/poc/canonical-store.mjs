/**
 * POC canonical store — the in-repo REFERENCE BACKEND behind the
 * backend-neutral persistence port (ADR-025, CSIR-FR-060..066).
 *
 * It is append-only: every accepted materialization commits a new graph
 * revision and prior revisions stay readable, so canonical state is never
 * silently overwritten (CSIR-FR-021/024).
 *
 * GenesisBlockDB is a different implementation of this same port. Nothing in
 * this module may leak into the semantic contracts above it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256, stableStringify } from "./candidate-extractor.mjs";

export const REVISION_SCHEMA_VERSION = "govibe-canonical-graph-revision/v1";

const LOG_FILE = "revisions.ndjson";

function revisionId(sequence) {
  return `rev-${String(sequence).padStart(6, "0")}`;
}

/** Deterministic ordering so equal graphs serialize identically. */
function sortAtoms(atoms) {
  return [...atoms].sort((left, right) => left.canonicalRef.localeCompare(right.canonicalRef));
}

function sortRelations(relations) {
  return [...relations].sort((left, right) => left.relationRef.localeCompare(right.relationRef));
}

/**
 * @param {{root: string}} options `root` is a workspace directory; state lands
 *   under `<root>/canonical/`.
 */
export function createCanonicalStore({ root }) {
  if (typeof root !== "string" || !root.trim()) throw new TypeError("store root is required.");
  const dir = path.join(root, "canonical");
  const logPath = path.join(dir, LOG_FILE);

  async function readRevisions() {
    let raw;
    try {
      raw = await readFile(logPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    return raw.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
  }

  return {
    port: "govibe-canonical-persistence/v1",
    backend: "reference-file",

    /** Head revision, or an empty genesis view when nothing is committed yet. */
    async readHead() {
      const revisions = await readRevisions();
      const head = revisions.at(-1);
      if (!head) {
        return { revision: revisionId(0), sequence: 0, atoms: [], relations: [], empty: true };
      }
      return { ...head, empty: false };
    },

    async readRevision(revision) {
      const revisions = await readRevisions();
      const found = revisions.find((entry) => entry.revision === revision);
      if (!found) throw new Error(`Unknown graph revision: ${revision}`);
      return found;
    },

    async listRevisions() {
      return (await readRevisions()).map((entry) => entry.revision);
    },

    /** Look up canonical identity previously assigned to a candidate. */
    async findAtomByCandidateRef(candidateRef) {
      const head = await this.readHead();
      return head.atoms.find((atom) => atom.candidateRef === candidateRef) ?? null;
    },

    /**
     * Commit a new graph revision. `atoms` fully replaces the head atom set for
     * the refs it carries; atoms absent from the commit are carried forward
     * unchanged so a partial promotion cannot silently drop canonical state.
     */
    async commit({ atoms = [], relations = [], promotionRef, materializationRef, sourceHash, actor, runId, committedAt }) {
      if (!promotionRef || !materializationRef) throw new Error("Commit requires promotion and materialization references.");
      const head = await this.readHead();
      const merged = new Map(head.atoms.map((atom) => [atom.canonicalRef, atom]));
      for (const atom of atoms) merged.set(atom.canonicalRef, atom);
      const mergedRelations = new Map(head.relations.map((relation) => [relation.relationRef, relation]));
      for (const relation of relations) mergedRelations.set(relation.relationRef, relation);

      const sequence = head.sequence + 1;
      const nextAtoms = sortAtoms([...merged.values()]);
      const nextRelations = sortRelations([...mergedRelations.values()]);
      const entry = {
        schema_version: REVISION_SCHEMA_VERSION,
        revision: revisionId(sequence),
        sequence,
        parentRevision: head.empty ? null : head.revision,
        promotionRef,
        materializationRef,
        sourceHash,
        actor,
        runId,
        committedAt,
        atoms: nextAtoms,
        relations: nextRelations,
        graphHash: sha256(stableStringify({ atoms: nextAtoms, relations: nextRelations })),
      };

      await mkdir(dir, { recursive: true });
      const existing = await readRevisions();
      await writeFile(logPath, [...existing, entry].map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
      return entry;
    },
  };
}
