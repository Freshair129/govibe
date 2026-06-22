// Translator-core slice — code-AST atomizer (FR-1, code path; ADR-019 universal code-in).
// Uses the TypeScript compiler API (already a project dependency) to parse JS/TS into atoms:
// top-level functions, classes (+ methods), consts, interfaces, type aliases, enums.
// Each atom carries real symbol provenance (file + symbol + line range) — that also satisfies
// the symbol-link intent (FR-3) for the code path. Other languages are a later increment.
//
// Atoms share the SAME shape + key function as the Markdown atomizer, so the renderer and the
// round-trip fidelity check work uniformly across doc and code sources.

import ts from "typescript";
import { atomKey } from "./atomizer.mjs";

function scriptKind(lang) {
  switch (String(lang).toLowerCase()) {
    case "tsx": return ts.ScriptKind.TSX;
    case "jsx": return ts.ScriptKind.JSX;
    case "js": case "mjs": case "cjs": return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}

function slug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "symbol";
}

/**
 * Decompose JS/TS source into GKS atoms.
 * @returns {{atoms: Array<{id,level,heading,content,order,parentId,key,type,sourceRefs}>}}
 */
export function atomizeCode(source, { file = "inline.ts", lang = "ts" } = {}) {
  const sf = ts.createSourceFile(file, String(source ?? ""), ts.ScriptTarget.Latest, /* setParentNodes */ true, scriptKind(lang));
  const atoms = [];
  const idCounts = new Map();
  let order = 0;

  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const add = (node, name, type, level, parentId, { container = false } = {}) => {
    // Containers (classes) keep an empty body so their members are not duplicated; the members
    // carry the code. Leaf symbols carry their own source text.
    const content = container ? "" : node.getText(sf);
    let id = slug(name);
    const n = (idCounts.get(id) ?? 0) + 1;
    idCounts.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    atoms.push({
      id, level, heading: String(name), content, order: order++, parentId,
      key: atomKey(name, content),
      type,
      sourceRefs: [{ file, symbol: String(name), lines: `${lineOf(node.getStart(sf))}-${lineOf(node.getEnd())}` }],
    });
    return id;
  };

  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) {
      add(st, st.name.getText(sf), "function", 1, null);
    } else if (ts.isClassDeclaration(st) && st.name) {
      const cid = add(st, st.name.getText(sf), "class", 1, null, { container: true });
      for (const m of st.members) {
        if ((ts.isMethodDeclaration(m) || ts.isGetAccessor(m) || ts.isSetAccessor(m) || ts.isConstructorDeclaration(m)) && (m.name || ts.isConstructorDeclaration(m))) {
          const mname = ts.isConstructorDeclaration(m) ? "constructor" : m.name.getText(sf);
          add(m, mname, "method", 2, cid);
        }
      }
    } else if (ts.isInterfaceDeclaration(st) && st.name) {
      add(st, st.name.getText(sf), "interface", 1, null);
    } else if (ts.isTypeAliasDeclaration(st) && st.name) {
      add(st, st.name.getText(sf), "type", 1, null);
    } else if (ts.isEnumDeclaration(st) && st.name) {
      add(st, st.name.getText(sf), "enum", 1, null);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) {
          const isFn = d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer));
          add(d, d.name.getText(sf), isFn ? "function" : "const", 1, null);
        }
      }
    }
  }

  return { atoms };
}

export const CODE_LANGS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);
