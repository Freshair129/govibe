import ts from "typescript";

import { byCodepoint } from "./workspace-adapter.mjs";

/**
 * Helpers shared by the Mode 2 stage modules. Extracted so stages 5–11 can reuse the parsing
 * and scoping primitives stages 1–4 established without importing back into `stages.mjs`,
 * which would be circular.
 */

export const TS_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".mts", ".cts"]);

export const UNSUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".py", ".java", ".go", ".rs", ".rb", ".php", ".cs", ".kt", ".swift", ".scala", ".cbl", ".cob",
]);

export { byCodepoint };

export function isTestPath(filePath) {
  return /(^|\/)(tests?|__tests__|spec|e2e)(\/|$)/i.test(filePath) || /\.(test|spec)\.[a-z]+$/i.test(filePath);
}

export function parseSource(filePath, text) {
  const kind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind);
}

export function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

/**
 * The semantic scope from Stage 2. Generated and vendored files stay in the inventory as
 * evidence but are excluded from semantic reconstruction, so every later stage must filter
 * through this rather than through the raw file list.
 */
export function semanticScope({ artifacts, files }) {
  const inventory = artifacts.get(2);
  return new Set(inventory?.semantic_scope ?? files.map((file) => file.path));
}

export function classificationIndex({ artifacts }) {
  return new Map((artifacts.get(2)?.files ?? []).map((file) => [file.path, file.classification]));
}

export function parsableSources({ files, artifacts, includeTests = true }) {
  const scope = semanticScope({ artifacts, files });
  return files.filter(
    (file) => TS_EXTENSIONS.has(file.extension) && scope.has(file.path) && (includeTests || !isTestPath(file.path)),
  );
}

/**
 * Parses each candidate once and reports what it could not parse, so a stage never silently
 * narrows its own input set.
 */
export async function parseAll({ candidates, read }) {
  const parsed = [];
  const unresolved = [];
  for (const file of candidates) {
    let source;
    try {
      source = parseSource(file.path, await read(file.path));
    } catch (error) {
      unresolved.push({ kind: "unparsed-source", path: file.path, reason: String(error?.message ?? error) });
      continue;
    }
    if (source.parseDiagnostics?.length) {
      unresolved.push({ kind: "parse-diagnostic", path: file.path, reason: String(source.parseDiagnostics[0].messageText) });
      continue;
    }
    parsed.push({ file, source });
  }
  return { parsed, unresolved };
}

export function positionOf(node, source) {
  const start = node.getStart(source);
  const position = source.getLineAndCharacterOfPosition(start);
  return { start, line: position.line + 1, character: position.character + 1 };
}

export function sortById(items) {
  return items.slice().sort((left, right) => byCodepoint(left.id, right.id));
}

export function uniqueBy(items, key) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const identity = key(item);
    if (seen.has(identity)) continue;
    seen.add(identity);
    output.push(item);
  }
  return output;
}

/**
 * Presence detection, not architecture recovery. A stage may report that a concern is
 * observable in the tree and cite where; it may not claim to have recovered how the concern
 * is designed. Anything beyond presence is inference and belongs behind the LLM tier.
 */
export function detectSignals({ text, filePath, signals }) {
  const found = [];
  for (const [name, pattern] of Object.entries(signals)) {
    const match = pattern.exec(text);
    if (match) found.push({ name, path: filePath, evidence: match[0].slice(0, 80) });
    pattern.lastIndex = 0;
  }
  return found;
}
