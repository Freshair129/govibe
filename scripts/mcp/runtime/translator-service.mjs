import { readFileSync } from "node:fs";
import { resolvePathWithinAnyRoot } from "../path-security.mjs";
import { atomize } from "../translator/atomizer.mjs";
import { extractTemplate } from "../translator/format-template.mjs";
import { render as renderFromTemplate, selectScope } from "../translator/renderer.mjs";
import { evaluate as evaluateFidelity } from "../translator/fidelity.mjs";
import { buildRecord as buildProvenance, appendRecord as defaultAppendProvenance } from "../translator/provenance.mjs";
import { atomizeCode, CODE_LANGS } from "../translator/code-atomizer.mjs";

const auditRef = (capability) => `${capability}:${new Date().toISOString()}`;

export class TranslatorService {
  #atoms = new Map(); #templates = new Map();
  constructor({ workspaceRoot, appendTerminal = () => {}, appendProvenance = defaultAppendProvenance, allowedRoots }) { this.workspaceRoot = workspaceRoot; this.appendTerminal = appendTerminal; this.appendProvenance = appendProvenance; this.allowedRoots = allowedRoots ?? [workspaceRoot]; }
  async ingest(args = {}) {
    const startedAt = new Date().toISOString(); const repo = args.repo ?? args.repoPath ?? "unknown";
    let text = String(args.content ?? ""); let lang = String(args.lang ?? "").toLowerCase();
    if (!text && args.repoPath) {
      // TASK-PRD-027 (AUD-05): previously honored an absolute path or a `..`-escaping
      // relative repoPath with no containment. resolvePathWithinAnyRoot rejects both BEFORE
      // any read; a legitimately missing-but-contained path keeps the prior soft-fail
      // ("no atoms parsed") behavior instead of throwing.
      let absolute;
      try {
        absolute = await resolvePathWithinAnyRoot(args.repoPath, this.allowedRoots, { basePath: this.workspaceRoot });
      } catch (error) {
        if (error?.code !== "PATH_NOT_FOUND") throw error;
      }
      if (absolute) { text = readFileSync(absolute, "utf8"); if (!lang) lang = (args.repoPath.split(".").pop() || "").toLowerCase(); }
    }
    if (!lang) lang = "md"; const isCode = CODE_LANGS.has(lang);
    const atoms = isCode ? atomizeCode(text, { file: args.repoPath ?? `inline.${lang}`, lang }).atoms : atomize(text).atoms;
    const template = isCode ? extractTemplate("", { repo }) : extractTemplate(text, { repo });
    const atomsRef = `atoms:${repo}:${this.#atoms.size + 1}`; this.#atoms.set(atomsRef, atoms); this.#templates.set(template.id, template);
    const ref = auditRef("govibe.ingest.code"); this.appendProvenance(buildProvenance({ kind: "ingest", auditRef: ref, actor: args.actor, atomsRef, templateRef: template.id, startedAt, endedAt: new Date().toISOString() }));
    this.appendTerminal("translator", `Ingested ${atoms.length} atoms from ${repo}.`);
    return { capability: "govibe.ingest.code", mode: isCode ? "code" : "doc", lang, atomCount: atoms.length, atomsRef, templateRef: template.id, templateConfidence: template.confidence, needsConfirm: template.needsConfirm, warnings: atoms.length === 0 ? ["no atoms parsed — provide `content` or a readable repoPath"] : [], auditRef: ref };
  }
  render(args = {}) {
    const startedAt = new Date().toISOString(); const ref = auditRef("govibe.render"); const all = this.#atoms.get(args.atomsRef);
    if (!all) return { capability: "govibe.render", verdict: "block", document: null, citedAtoms: [], error: `unknown atomsRef: ${args.atomsRef}`, auditRef: ref };
    const template = this.#templates.get(args.templateRef) ?? extractTemplate("", {}); const selected = selectScope(all, { selectorId: args.selector ?? null, hop: args.hop ?? 6 });
    const rendered = renderFromTemplate(selected, template, {}); const sourceText = selected.map((atom) => `${"#".repeat(atom.level)} ${atom.heading}\n${atom.content}`).join("\n\n");
    const fidelity = evaluateFidelity({ sourceAtoms: selected, sourceText, rendered }); const citedAtoms = selected.map((atom) => atom.id);
    this.appendProvenance(buildProvenance({ kind: "render", auditRef: ref, actor: args.actor, atomsRef: args.atomsRef, templateRef: args.templateRef ?? null, citedAtoms, fidelity, startedAt, endedAt: new Date().toISOString() }));
    this.appendTerminal("translator", `Rendered doc (fidelity: ${fidelity.verdict}).`);
    return { capability: "govibe.render", verdict: fidelity.verdict, document: fidelity.verdict === "block" ? null : rendered, citedAtoms, fidelity, needsConfirm: fidelity.verdict === "flag" ? ["fidelity below pass threshold — human confirm before deliverable"] : [], auditRef: ref };
  }
}
