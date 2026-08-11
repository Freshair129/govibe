import { byCodepoint, isTestPath, sortById } from "./stage-shared.mjs";

/**
 * WHAT-IS versus WHAT-SHOULD-BE (architecture §9).
 *
 *     Bottom-Up Model (code)  ↕  Top-Down Model (intent artefacts)
 *
 * The binding rule: **do not automatically fix contradictions.** This module emits candidates
 * with evidence and ranks them for human review. It never edits, never resolves, and never
 * decides which side is right on its own authority.
 */

const GAP_SCHEMA = "govibe-mode2-gap-analysis/v1";

/**
 * The fourteen gap classes the architecture names. `detectable` records whether this tranche
 * can establish the class deterministically — an undetectable class is listed as such rather
 * than silently omitted, so a clean report cannot be mistaken for a complete one.
 */
export const GAP_CLASSES = Object.freeze({
  unimplemented_requirement: { detectable: true, axis: "governed", description: "declared in an intent artefact, no code claims it" },
  missing_requirement: { detectable: true, axis: "governed", description: "code exists in a profile requiring requirements, and none are declared" },
  missing_tests: { detectable: true, axis: "behaviour", description: "a module no test exercises" },
  orphan_tests: { detectable: true, axis: "behaviour", description: "a test exercising nothing inside the semantic scope" },
  stale_documentation: { detectable: true, axis: "governed", description: "a document referencing a path that no longer exists" },
  agent_governor_drift: { detectable: true, axis: "governed", description: "an instruction file exists but a capability axis it implies is unobserved" },
  undocumented_implementation: { detectable: true, axis: "governed", description: "an interface no intent artefact mentions" },
  architecture_drift: { detectable: false, axis: "governed", description: "needs a declared target architecture to compare against" },
  api_drift: { detectable: false, axis: "behaviour", description: "needs a declared API contract to diff the observed surface against" },
  schema_drift: { detectable: false, axis: "behaviour", description: "needs a declared schema baseline" },
  security_drift: { detectable: false, axis: "behaviour", description: "needs a declared control set, not a signal scan" },
  roadmap_drift: { detectable: false, axis: "governed", description: "needs roadmap task state bound to observable completion evidence" },
  missing_implementation: { detectable: false, axis: "behaviour", description: "indistinguishable from unimplemented_requirement without a component-level target model" },
  unknown_semantic_gap: { detectable: true, axis: "governed", description: "a dimension the block profile requires that nothing supplies" },
  // A fifteenth class, added by RCA-2026-08-12 CA-04. The architecture §10 names fourteen; this
  // one is a GoVibe addition, because none of the fourteen covered "implemented, exported, and
  // imported by nobody".
  unconsumed_capability: {
    detectable: true,
    axis: "behaviour",
    architecture_class: false,
    description: "an exporting module that no reachable module imports",
  },
});

/**
 * What `unconsumed_capability` does and does not cover.
 *
 * It detects a module that exports something and sits outside the reachable set computed by
 * Stage 7. That is genuine dead capability and worth reporting.
 *
 * It does **not** detect the case the RCA that created it was about. `context-packet.mjs` was
 * imported by `continue.mjs`, which is reachable, so the capability was consumed — just not by
 * the new subsystem that should have consumed it. Detecting "A consumes it, B does not, and B
 * should have" requires a *declared expectation* about B, which is a planning artefact rather
 * than an observation. `AC-C1..C4` (RCA CA-05) is what covers that; this class does not.
 */
export const UNCONSUMED_CAPABILITY_SCOPE = Object.freeze({
  detects: "an exporting module no reachable module imports",
  does_not_detect: "a capability consumed by one subsystem but skipped by another that should consume it",
  reason: "that needs a declared expectation, not an observation; see RCA-2026-08-12 CA-05",
});

/**
 * Two-axis contradiction ranking — ADR-028 Decision 2. **ADR-028 is `proposed`, not accepted**,
 * so ranking is applied as an additive attribute and the finding stands without it.
 *
 * RWANG's flat `Code > SDD > PRD` is correct only for behaviour. For governed semantics the
 * order inverts: STD and ADR outrank code, which is precisely why this repository has an
 * H-axis remediation phase. A contradiction whose axis cannot be established stays unranked
 * rather than being ranked on a guess.
 */
export function rankContradiction({ axis }) {
  if (axis === "behaviour") return { ranked: true, precedence: ["code", "sdd", "prd"], basis: "runtime behaviour: the code is what actually runs" };
  if (axis === "governed") return { ranked: true, precedence: ["std_adr", "sdd", "code"], basis: "governed semantics: the standard defines the term, code must conform" };
  return { ranked: false, precedence: null, basis: "axis could not be established; left unranked rather than guessed" };
}

/**
 * Finding severity — ADR-028 Decision 3, likewise proposed and likewise additive.
 *
 * No deterministic finding is `critical`. The first calibration marked unimplemented
 * requirements and stale documents critical, which made 761 of 763 findings on this repository
 * critical — a triage axis on which everything is urgent conveys nothing. `critical` is reserved
 * for a contradiction whose evidence is itself unambiguous and consequential, and no detector in
 * this tranche establishes one. An empty critical bucket is the honest result.
 */
function severityFor(gapClass) {
  if (gapClass === "unimplemented_requirement" || gapClass === "missing_requirement") return "warning";
  if (gapClass === "stale_documentation" || gapClass === "missing_tests") return "warning";
  if (gapClass === "unknown_semantic_gap" || gapClass === "agent_governor_drift") return "warning";
  if (gapClass === "unconsumed_capability") return "info";
  return "info";
}

function finding({ gapClass, subject, evidence, detail }) {
  const meta = GAP_CLASSES[gapClass];
  const ranking = rankContradiction({ axis: meta.axis });
  return {
    id: `mode2-gap:${gapClass}:${subject}`,
    gap_class: gapClass,
    subject,
    description: meta.description,
    evidence,
    detail: detail ?? null,
    // ADR-028 D2/D3 (proposed). The finding is complete without either field.
    severity: severityFor(gapClass),
    contradiction_ranking: ranking,
    // Candidates and evidence only. §9 forbids automatically fixing contradictions.
    resolution: "candidate-for-human-review",
    auto_resolved: false,
  };
}

export function analyzeGaps({ ir, intendedModel, coverage, verificationModel, agentManifest, behaviourModel, structureModel, files = [] }) {
  const findings = [];
  const knownPaths = new Set(files.map((file) => file.path));

  // --- unconsumed capability: an exporting module nothing reachable imports ------------------
  if (behaviourModel && structureModel) {
    const exportingModules = new Set((structureModel.modules ?? []).filter((module) => (module.exports ?? []).length > 0).map((module) => `mode2-module:${module.path}`));
    const entrypointTargets = new Set((behaviourModel.entrypoints ?? []).map((entry) => `mode2-module:${entry.target}`));
    const unconsumed = (behaviourModel.unreachable_modules ?? [])
      .filter((moduleId) => exportingModules.has(moduleId))
      .filter((moduleId) => !entrypointTargets.has(moduleId))
      // A test exports nothing anyone should import; excluding it keeps the finding actionable.
      .filter((moduleId) => !isTestPath(moduleId.replace("mode2-module:", "")))
      .sort(byCodepoint);
    if (unconsumed.length) {
      findings.push(
        finding({
          gapClass: "unconsumed_capability",
          subject: "modules",
          evidence: unconsumed.slice(0, 25),
          detail: `${unconsumed.length} module(s) export something that no reachable module imports`,
        }),
      );
    }
  }

  // --- unimplemented requirement: declared in intent, never claimed by code ------------------
  const claimed = new Set(
    (verificationModel?.annotations?.explicit_links ?? [])
      .concat(verificationModel?.resolvedAnnotationLinks ?? [])
      .map((link) => link.to?.replace(/^mode2-intent:(requirement|decision):/, ""))
      .filter(Boolean),
  );
  for (const requirement of intendedModel?.requirement_index ?? []) {
    if (claimed.has(requirement.id)) continue;
    findings.push(
      finding({
        gapClass: "unimplemented_requirement",
        subject: requirement.id,
        evidence: requirement.declared_in,
        detail: "no @req annotation in code names this requirement",
      }),
    );
  }

  // --- missing requirement: the profile requires them and the intent model has none ----------
  if ((coverage?.required ?? []).includes("requirement") && (intendedModel?.requirement_index ?? []).length === 0) {
    findings.push(
      finding({
        gapClass: "missing_requirement",
        subject: "workspace",
        evidence: [`block profile ${coverage.block_profile} requires the requirement dimension`],
        detail: "no requirement identifier is declared anywhere in the intent artefacts",
      }),
    );
  }

  // --- missing / orphan tests from the observed dependency edges -----------------------------
  const testEdges = (ir?.relations ?? []).filter((relation) => relation.kind === "test" || relation.rel === "EXERCISES");
  const exercised = new Set(testEdges.map((relation) => relation.to));
  const modules = new Set(
    (ir?.atoms ?? [])
      .filter((atom) => atom.dimension === "structure" && atom.source)
      .map((atom) => `mode2-module:${atom.source}`),
  );
  const untested = [...modules].filter((moduleId) => !exercised.has(moduleId)).sort(byCodepoint);
  if (untested.length) {
    findings.push(
      finding({
        gapClass: "missing_tests",
        subject: "modules",
        evidence: untested.slice(0, 25),
        detail: `${untested.length} module(s) are exercised by no test`,
      }),
    );
  }
  const exercisingFrom = new Set(testEdges.map((relation) => relation.from));
  const orphanTests = (verificationModel?.tests ?? [])
    .map((test) => `mode2-module:${test.path}`)
    .filter((testId) => !exercisingFrom.has(testId))
    .sort(byCodepoint);
  if (orphanTests.length) {
    findings.push(
      finding({
        gapClass: "orphan_tests",
        subject: "tests",
        evidence: orphanTests.slice(0, 25),
        detail: `${orphanTests.length} test(s) import nothing inside the semantic scope`,
      }),
    );
  }

  // --- stale documentation: an intent document naming a path that does not exist -------------
  // Aggregated per document, not per reference. One finding per broken link produced 645
  // findings on this repository, which is a report nobody reads rather than a report that is
  // wrong — and a per-reference severity of `critical` made the severity axis meaningless.
  const caseInsensitivePaths = new Set([...knownPaths].map((candidate) => candidate.toLowerCase()));
  for (const document of intendedModel?.documents ?? []) {
    const broken = (document.path_references ?? []).filter(
      (reference) => !knownPaths.has(reference) && !caseInsensitivePaths.has(reference.toLowerCase()),
    );
    if (!broken.length) continue;
    findings.push(
      finding({
        gapClass: "stale_documentation",
        subject: document.path,
        evidence: broken.slice(0, 20),
        detail: `${broken.length} referenced path(s) are not in the workspace`,
      }),
    );
  }

  // --- agent-governor drift ------------------------------------------------------------------
  for (const capability of agentManifest?.capabilities ?? []) {
    if (capability.classification !== "MISSING") continue;
    findings.push(
      finding({
        gapClass: "agent_governor_drift",
        subject: capability.axis,
        evidence: agentManifest.instructions?.filter((item) => item.exists).map((item) => item.path) ?? [],
        detail: "an agent system is present but this capability axis is neither observed nor platform-supplied",
      }),
    );
  }

  // --- undocumented implementation -----------------------------------------------------------
  const documentedNames = new Set(
    (intendedModel?.documents ?? []).flatMap((document) => (document.sections ?? []).map((heading) => heading.toLowerCase())),
  );
  const undocumentedInterfaces = (ir?.atoms ?? [])
    .filter((atom) => atom.dimension === "interface" && atom.properties?.route)
    .filter((atom) => ![...documentedNames].some((heading) => heading.includes(String(atom.properties.route).toLowerCase())))
    .map((atom) => atom.identity)
    .sort(byCodepoint);
  if (undocumentedInterfaces.length) {
    findings.push(
      finding({
        gapClass: "undocumented_implementation",
        subject: "interfaces",
        evidence: undocumentedInterfaces.slice(0, 25),
        detail: `${undocumentedInterfaces.length} route(s) are named in no intent-document heading`,
      }),
    );
  }

  // --- unknown semantic gap: a required dimension nothing supplies ---------------------------
  for (const dimension of coverage?.missing ?? []) {
    findings.push(
      finding({
        gapClass: "unknown_semantic_gap",
        subject: dimension,
        evidence: [`block profile ${coverage.block_profile}`],
        detail: coverage.detail?.find((item) => item.dimension === dimension)?.gap_cause ?? null,
      }),
    );
  }

  const undetectable = Object.entries(GAP_CLASSES)
    .filter(([, meta]) => !meta.detectable)
    .map(([gapClass, meta]) => ({ gap_class: gapClass, reason: meta.description }));

  const bySeverity = {};
  for (const item of findings) bySeverity[item.severity] = (bySeverity[item.severity] ?? 0) + 1;

  return {
    schema: GAP_SCHEMA,
    canonical: false,
    // Stated because a short findings list must not read as a clean bill of health. Derived
    // from the table rather than written by hand, so the claim cannot drift from the code.
    completeness: `${Object.values(GAP_CLASSES).filter((meta) => meta.detectable).length} of ${Object.keys(GAP_CLASSES).length} gap classes are deterministically detectable in this tranche`,
    comparable: Boolean(ir) && Boolean(intendedModel),
    findings: sortById(findings),
    counts: { total: findings.length, by_severity: bySeverity },
    undetectable_classes: undetectable,
    governed_by: {
      ranking: "ADR-028 D2 (proposed)",
      severity: "ADR-028 D3 (proposed)",
      note: "each finding is complete without either attribute",
    },
    auto_resolution: "disabled by architecture §9; every finding is a candidate for human review",
  };
}
