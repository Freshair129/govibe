import path from "node:path";

import { byCodepoint, classificationIndex, isTestPath, semanticScope, sortById, uniqueBy } from "./stage-shared.mjs";

/**
 * Stage 10 — Test / Verification / Evidence Scan
 *
 * Includes the annotation extractor from ADR-028 Decision 1. **ADR-028 is `proposed`, not
 * accepted.** The extractor is therefore deliberately isolated in `extractAnnotations` and
 * contributes an additive `annotations` block: if the owner rejects D1, deleting that function
 * and the block removes the mechanism without touching the rest of the stage.
 */

const ANNOTATION_PATTERN = /@(req|spec|designs|tested)\s+([^\r\n]*)/g;
const ID_SEPARATOR = /[,\s]+/;

/**
 * Annotations are precedence tier 1 (deterministic parse of an explicit human assertion), not
 * tier 6 inference. A parsed annotation is `explicit: true`, `inferred: false`, `confidence: 1`.
 *
 * Critically, an annotation is *evidence, not authority*. `@req FR-001` does not create FR-001.
 * Mode 2 has no requirement index until the top-down intent scan lands (T3), so every `@req`,
 * `@spec`, and `@designs` target is recorded as UNRESOLVED rather than minting the node it
 * names — a scanner that minted those targets would be minting identity, which the candidate
 * model forbids.
 */
function extractAnnotations({ file, text, knownPaths }) {
  const links = [];
  const unresolved = [];
  text.split(/\r?\n/).forEach((line, index) => {
    ANNOTATION_PATTERN.lastIndex = 0;
    let match;
    while ((match = ANNOTATION_PATTERN.exec(line))) {
      const [, tag, rest] = match;
      const payload = rest.split("—")[0].split(" - ")[0].trim();
      if (!payload) continue;
      const lineNumber = index + 1;

      if (tag === "tested") {
        // The only tag whose target this tranche can resolve: a workspace-relative path.
        const target = payload.split(ID_SEPARATOR)[0].replace(/^\.\//, "").split("::")[0];
        const resolved = knownPaths.has(target)
          ? target
          : [...knownPaths].find((candidate) => candidate.endsWith(`/${target}`) || path.posix.basename(candidate) === target);
        if (resolved) {
          links.push({
            id: `mode2-annotation:tested:${file.path}:${lineNumber}`,
            tag: "tested",
            from: `mode2-module:${file.path}`,
            to: `mode2-module:${resolved}`,
            rel: "TESTED_BY",
            explicit: true,
            inferred: false,
            confidence: 1,
            candidate: true,
            path: file.path,
            source_span: { line: lineNumber },
            evidence: match[0].slice(0, 100),
          });
        } else {
          unresolved.push({ kind: "unresolved-annotation-target", tag, target, path: file.path, line: lineNumber });
        }
        continue;
      }

      for (const identifier of payload.split(ID_SEPARATOR).filter(Boolean)) {
        unresolved.push({
          kind: "unresolved-annotation-target",
          tag,
          target: identifier,
          path: file.path,
          line: lineNumber,
          reason: "no requirement or document-section index until the top-down intent scan (T3)",
        });
      }
    }
  });
  return { links, unresolved };
}

const CI_ROOTS = [".github/workflows", ".gitlab-ci.yml", ".circleci", "azure-pipelines.yml", "Jenkinsfile"];
const GATE_SCRIPTS = { lint: /lint|tsc|typecheck/i, test: /(^|:)test/i, build: /build/i, security: /security|audit|snyk/i, docs: /docs?:/i };

const stage10 = {
  stage: 10,
  extractorVersion: "1.0.0",
  method: "test-inventory-import-inference-and-annotation-parse",
  usesTreeShape: true,
  dependsOnStages: [2, 4],
  inputs: (files) => [
    ...files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i.test(file.path)).map((file) => file.path),
    ...files.filter((file) => path.posix.basename(file.path) === "package.json").map((file) => file.path),
    ...files.filter((file) => CI_ROOTS.some((root) => file.path === root || file.path.startsWith(`${root}/`))).map((file) => file.path),
  ],
  async run({ files, artifacts, read }) {
    const scope = semanticScope({ artifacts, files });
    const classification = classificationIndex({ artifacts });
    const inScope = files.filter((file) => scope.has(file.path));
    const knownPaths = new Set(files.map((file) => file.path));

    const tests = inScope.filter((file) => classification.get(file.path) === "test" || isTestPath(file.path));
    const ciFiles = files.filter((file) => CI_ROOTS.some((root) => file.path === root || file.path.startsWith(`${root}/`)));
    const manifests = inScope.filter((file) => path.posix.basename(file.path) === "package.json");

    if (!tests.length && !ciFiles.length && !manifests.length) {
      return { status: "not_applicable", confidence: 1, exclusions: ["inventory_contains_no_verification_sources"], artifact: null };
    }

    const unresolved = [];
    const annotationLinks = [];
    const inferredLinks = [];

    // Inferred test -> subject links from relative imports. These stay candidates with
    // `inferred: true`: a test importing a module is evidence of coverage intent, not proof
    // that the module's requirement is validated.
    const dependencyEdges = artifacts.get(4)?.edges ?? [];
    for (const edge of dependencyEdges) {
      if (edge.rel !== "IMPORTS" || edge.kind !== "test") continue;
      inferredLinks.push({
        id: `mode2-verification:covers:${edge.from}->${edge.to}`,
        from: edge.from,
        to: edge.to,
        rel: "EXERCISES",
        explicit: false,
        inferred: true,
        confidence: 0.5,
        candidate: true,
        evidence: edge.evidence,
      });
    }

    // Annotation parse (ADR-028 D1, contingent on that ADR's acceptance).
    const annotationCandidates = inScope.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i.test(file.path));
    let annotationFiles = 0;
    for (const file of annotationCandidates) {
      let text;
      try {
        text = await read(file.path);
      } catch (error) {
        unresolved.push({ kind: "unreadable-source", path: file.path, reason: String(error?.message ?? error) });
        continue;
      }
      if (!text.includes("@req") && !text.includes("@spec") && !text.includes("@designs") && !text.includes("@tested")) continue;
      annotationFiles += 1;
      const extracted = extractAnnotations({ file, text, knownPaths });
      annotationLinks.push(...extracted.links);
      unresolved.push(...extracted.unresolved);
    }

    // CI gates. Workflow files are detected and their `npm run <script>` invocations read,
    // which is a robust line-level parse. Full YAML job semantics are not parsed and are named.
    const gates = [];
    for (const file of ciFiles) {
      let text;
      try {
        text = await read(file.path);
      } catch (error) {
        unresolved.push({ kind: "unreadable-ci-definition", path: file.path, reason: String(error?.message ?? error) });
        continue;
      }
      for (const match of text.matchAll(/(?:npm|pnpm|yarn)\s+run\s+([a-zA-Z0-9:_-]+)/g)) {
        gates.push({ id: `mode2-gate:ci:${file.path}:${match[1]}`, kind: "ci-invocation", script: match[1], path: file.path });
      }
      unresolved.push({ kind: "unparsed-ci-semantics", path: file.path, detail: "job graph, conditions, and path filters not parsed" });
    }

    for (const manifest of manifests) {
      let json;
      try {
        json = JSON.parse(await read(manifest.path));
      } catch (error) {
        unresolved.push({ kind: "unparsed-manifest", path: manifest.path, reason: String(error?.message ?? error) });
        continue;
      }
      for (const [name] of Object.entries(json.scripts ?? {})) {
        const category = Object.entries(GATE_SCRIPTS).find(([, pattern]) => pattern.test(name))?.[0];
        if (category) gates.push({ id: `mode2-gate:script:${name}`, kind: `declared-${category}`, script: name, path: manifest.path });
      }
    }

    const validated = annotationLinks.length;
    const total = validated + inferredLinks.length;
    return {
      status: unresolved.length ? "incomplete" : "complete",
      error: unresolved.length ? `verification_evidence_gaps:${unresolved.length}` : undefined,
      confidence: total === 0 ? 0 : Number((validated / total).toFixed(4)),
      unresolved,
      artifact: {
        schema: "govibe-mode2-verification-model/v1",
        tests: sortById(tests.map((file) => ({ id: `mode2-test:${file.path}`, path: file.path, size: file.size }))),
        gates: sortById(uniqueBy(gates, (item) => item.id)),
        annotations: {
          // ADR-028 D1 — proposed, not accepted. Isolated so rejection is a clean deletion.
          governed_by: "ADR-028-RWANG-SKILL-ABSORPTION-MODE-2-DEEP-SCAN (proposed)",
          files_with_annotations: annotationFiles,
          explicit_links: sortById(annotationLinks),
        },
        inferred_links: sortById(inferredLinks),
        counts: { tests: tests.length, gates: gates.length, explicit_links: validated, inferred_links: inferredLinks.length },
      },
    };
  },
};

export const verificationStages = [stage10];
export { extractAnnotations };
