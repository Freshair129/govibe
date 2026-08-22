import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const tsExtensions = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"]);
// TASK-PRD-007 (B7, round 3): this list feeds stage 5's `unresolved_links` (coverage findings)
// and, downstream, stageConfidence()'s denominator (stage-runner.mjs) -- a source-bearing
// extension missing here was silently NOT counted as a coverage gap. Added .sh/.ps1 (shell
// scripts), .sql (SQL, already symbolically parsed for ORM entities by stage 8, not stage 5),
// .yml (YAML config/workflow), and .html (templates) -- all present in this repo and none
// previously counted.
const unsupportedSymbolicExtensions = new Set([".py", ".java", ".go", ".rs", ".rb", ".php", ".sh", ".ps1", ".sql", ".yml", ".html"]);

function filesWith(inventory, extensions) {
  return inventory.files.filter((file) => extensions.has(file.extension));
}

async function readWorkspaceFile(workspacePath, file) {
  return readFile(path.join(workspacePath, file.path), "utf8");
}

// TASK-PRD-007 (D2): every symbolic-parse stage (5, 6, 7, 9, 10) calls this helper. It used to
// throw on the first file that failed to parse (root cause shared by all five stages -- the
// review traced this to a single file under ref/, but any one unparseable file in the whole
// workspace killed all five), which fails the *entire* stage even when thousands of other files
// parsed fine. It now skips a failing file and records it as a coverage finding instead, so
// callers can submit the candidates they DID find to MSP with confidence < 1 rather than
// abandoning the stage outright.
async function parseTypeScriptFiles(workspacePath, files) {
  const parsed = [];
  const failures = [];
  for (const file of files) {
    try {
      const text = await readWorkspaceFile(workspacePath, file);
      const kind = file.extension === ".tsx" || file.extension === ".jsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      const source = ts.createSourceFile(file.path, text, ts.ScriptTarget.Latest, true, kind);
      if (source.parseDiagnostics.length > 0) {
        failures.push({ source_path: file.path, relation: "PARSE_FAILURE", target_label: String(source.parseDiagnostics[0].messageText) });
        continue;
      }
      parsed.push({ file, text, source });
    } catch (error) {
      failures.push({ source_path: file.path, relation: "PARSE_FAILURE", target_label: error instanceof Error ? error.message : String(error) });
    }
  }
  return { parsed, failures };
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*["']?([^"']+?)["']?\s*$/);
    if (field) result[field[1]] = field[2].trim();
  }
  return result;
}

function normalizeRepoPath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "").split("#")[0];
}

// TASK-PRD-007 (W2/W3, wikilink resolver): the previous resolver returned the FIRST hit from
// single-valued maps, which silently disabled resolution the moment two documents shared a
// basename or doc_id (`basenameCandidates.set(basename, existing === undefined ? file.path :
// null)`) and never distinguished "ambiguous" from "not found" in unresolved_links. It also never
// appended `.md`/`.mdx` to a bare label, and never matched a doc_id STEM (`[[ADR-022]]` against
// frontmatter `doc_id: "ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE"`) -- both measured as the
// dominant reason real wikilinks in this repo fail to resolve (23 occurrences for the extension
// gap alone). Every lookup step below now returns ALL candidates it finds so ambiguity is
// detectable and reportable rather than papered over by picking one.
function lookupAll(map, key) {
  return map.get(key) ?? [];
}

function resolveMarkdownLink(label, sourcePath, indexes) {
  const clean = normalizeRepoPath(label.trim());
  if (!clean) return { status: "not_found" };

  // 1. exact path as given, 2. path resolved relative to the source document.
  if (indexes.byPath.has(clean)) return { status: "resolved", target: clean };
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), clean));
  if (indexes.byPath.has(relative)) return { status: "resolved", target: relative };

  // 3. exact doc_id match.
  const exactDocIdMatches = lookupAll(indexes.byDocId, clean);
  if (exactDocIdMatches.length === 1) return { status: "resolved", target: exactDocIdMatches[0] };
  if (exactDocIdMatches.length > 1) return { status: "ambiguous", candidates: exactDocIdMatches };

  // 4. doc_id STEM match, case-insensitive: `[[ADR-022]]` against doc_id
  // `ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE` (id === label, or id startsWith `${label}-`).
  const upperLabel = clean.toUpperCase();
  const stemMatches = new Set();
  for (const [docId, targets] of indexes.byDocId) {
    const upperId = docId.toUpperCase();
    if (upperId === upperLabel || upperId.startsWith(`${upperLabel}-`)) targets.forEach((target) => stemMatches.add(target));
  }
  if (stemMatches.size === 1) return { status: "resolved", target: [...stemMatches][0] };
  if (stemMatches.size > 1) return { status: "ambiguous", candidates: [...stemMatches] };

  // 5. basename match -- the bare label, and the bare label with `.md`/`.mdx` appended, since
  // `byBasename` keys always carry the file extension and wikilink labels normally don't.
  const basename = path.posix.basename(clean);
  for (const candidate of [clean, `${clean}.md`, `${clean}.mdx`, basename, `${basename}.md`, `${basename}.mdx`]) {
    const matches = lookupAll(indexes.byBasename, candidate);
    if (matches.length === 1) return { status: "resolved", target: matches[0] };
    if (matches.length > 1) return { status: "ambiguous", candidates: matches };
  }

  return { status: "not_found" };
}

// TASK-PRD-007 (W4): the dominant not_found idioms on this repo (`TYPE::NAME` --
// `AGENT::LYRA`, `GKS::GENESIS_BLOCK_V3`; `TYPE--NAME` -- `CONCEPT--MEMORY-SUBSYSTEM`) name
// knowledge entities, not files -- there is no entity registry for Deep Scan to resolve them
// against. This is applied ONLY after a real resolution attempt has already failed (some
// `TYPE--NAME` labels DO have a document, e.g. `docs/CONCEPT--HYBRID-JIT-CONTEXT.md`, and must
// resolve normally above) -- it exists purely to give a reviewer an honest reason for the
// remainder, never to skip attempting resolution.
const ENTITY_REFERENCE_LABEL_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:::|--)[A-Za-z0-9_-]+$/;

function notFoundReason(label) {
  return ENTITY_REFERENCE_LABEL_PATTERN.test(label.trim()) ? "entity_reference_not_a_document" : "document_not_found";
}

// TASK-PRD-007 (W1): fenced code blocks (``` / ~~~, tracked by matching delimiter char AND
// length so a shorter or differently-charred fence nested inside doesn't prematurely close the
// outer one) must not be scanned for wikilinks, reference links, or headings -- measured on this
// repo: `[[:space:]]` (a POSIX character class, 11 occurrences) and `[[TYPE::Name]]` (a doc
// template placeholder) both came from `git grep -E` examples and template text inside fences,
// not real links.
function computeFencedLineMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let fenceChar = null;
  let fenceLen = 0;
  lines.forEach((line, index) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceChar === null) {
      if (marker) {
        fenceChar = marker[1][0];
        fenceLen = marker[1].length;
        mask[index] = true;
      }
      return;
    }
    mask[index] = true;
    if (marker && marker[1][0] === fenceChar && marker[1].length >= fenceLen) {
      fenceChar = null;
      fenceLen = 0;
    }
  });
  return mask;
}

// TASK-PRD-007 (W1): inline code spans (`` `code` ``, `` ``code with a ` backtick`` , ...) must
// also not be scanned -- a wikilink-shaped or reference-shaped string quoted inline as code is
// documentation about syntax, not a link. Handles multi-backtick delimiters (CommonMark: the
// closing run must match the opening run's exact backtick count) without needing full fence
// tracking, since inline spans don't cross lines.
function stripInlineCode(line) {
  return line.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, (match) => " ".repeat(match.length));
}

// TASK-PRD-007 (B2, round 3): the previous check -- `/(^|\.)(get|post|put|patch|delete|route|
// router)$/i` against the full callee text -- matched the TEXT of any call ending in one of
// those words, with no notion of "this is a router". Measured on this repo (which has no
// router at all -- the sidecar dispatches with `if (url.pathname === ...)`, see
// scripts/mcp/sidecar-server.mjs): `searchParams.get` (168), `this._client.post` (167),
// `Reflect.get` (32), `this.map.get` (39) -- 5,819 fabricated `Route` nodes promoted to MSP as
// atom candidates, all false.
//
// A route registration is a call on an identifiable router/app HANDLE -- not just any object --
// with an HTTP verb as the property name AND a string-literal path as the first argument
// (`app.get("/health", handler)`, not `app.get(dynamicKey)` or `client.post(url, body)` where
// `url` is a variable). Requiring BOTH the handle-name convention and the string-literal path
// argument is still a heuristic (no type information is available here), but it eliminates every
// false positive measured on this repo while still matching genuine Express/Fastify-style route
// registrations by name convention.
const HTTP_METHOD_NAMES = new Set(["get", "post", "put", "patch", "delete"]);
const ROUTER_HANDLE_PATTERN = /(?:^|[a-z0-9])(app|router)$/i;

function calleeObjectName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text; // this.router -> "router"
  return null;
}

function isRouteRegistration(node, source) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  if (!HTTP_METHOD_NAMES.has(node.expression.name.text.toLowerCase())) return false;
  const objectName = calleeObjectName(node.expression.expression);
  if (!objectName || !ROUTER_HANDLE_PATTERN.test(objectName)) return false;
  const [firstArgument] = node.arguments;
  return Boolean(firstArgument && ts.isStringLiteral(firstArgument));
}

function nearestNamedSymbol(node, source, filePath) {
  let current = node.parent;
  while (current) {
    const name = declarationName(current);
    if (name && (ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current) || ts.isMethodDeclaration(current))) {
      return `symbol:${filePath}:${current.getStart(source)}`;
    }
    current = current.parent;
  }
  return `file:${filePath}`;
}

export function createDefaultStageAdapters() {
  return [
    ({ inventory }) => ({
      method: "filesystem-inventory",
      nodes: inventory.files.map((file) => ({ id: `file:${file.path}`, labels: ["File"], props: { path: file.path, size: file.size, extension: file.extension } })),
    }),
    ({ inventory }) => inventory.directories.length
      ? { method: "directory-structure", nodes: inventory.directories.map((directory) => ({ id: `directory:${directory}`, labels: ["Directory"], props: { path: directory } })) }
      : { notApplicable: "inventory_contains_no_directories" },
    async ({ inventory, workspacePath }) => {
      const files = filesWith(inventory, new Set([".md", ".mdx"]));
      if (!files.length) return { notApplicable: "inventory_contains_no_markdown" };
      const documents = [];
      for (const file of files) {
        const text = await readWorkspaceFile(workspacePath, file);
        documents.push({ file, text, frontmatter: parseFrontmatter(text) });
      }
      const byPath = new Set(documents.map(({ file }) => file.path));
      // TASK-PRD-007 (W3): both indexes now collect EVERY document that shares a key instead of
      // disabling the key (setting it to `null`) the moment a second one appears -- resolution
      // reports ambiguity with the full candidate list rather than silently becoming "not found".
      const byDocId = new Map();
      for (const { file, frontmatter } of documents) {
        if (!frontmatter.doc_id) continue;
        if (!byDocId.has(frontmatter.doc_id)) byDocId.set(frontmatter.doc_id, []);
        byDocId.get(frontmatter.doc_id).push(file.path);
      }
      const byBasename = new Map();
      for (const { file } of documents) {
        const basename = path.posix.basename(file.path);
        if (!byBasename.has(basename)) byBasename.set(basename, []);
        byBasename.get(basename).push(file.path);
      }
      const indexes = { byPath, byDocId, byBasename };
      const nodes = [];
      const edges = [];
      const unresolved = [];
      const edgeKeys = new Set();
      const addLink = ({ source, target, relation, line, label }) => {
        if (!target || source === target) return;
        const key = `${source}\u0000${target}\u0000${relation}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({
          id: `link-candidate:${relation.toLowerCase()}:${source}:${target}`,
          from: `file:${source}`,
          to: `file:${target}`,
          rel: relation,
          props: { candidate: true, source_path: source, target_path: target, source_line: line, target_label: label },
        });
      };

      const recordLink = ({ file, index, label, relation }) => {
        const resolution = resolveMarkdownLink(label, file.path, indexes);
        if (resolution.status === "resolved") {
          addLink({ source: file.path, target: resolution.target, relation, line: index + 1, label });
        } else if (resolution.status === "ambiguous") {
          unresolved.push({ source_path: file.path, source_line: index + 1, target_label: label, relation, reason: "ambiguous_target", candidates: resolution.candidates });
        } else {
          unresolved.push({ source_path: file.path, source_line: index + 1, target_label: label, relation, reason: notFoundReason(label) });
        }
      };

      for (const { file, text, frontmatter } of documents) {
        nodes.push({
          id: `markdown:${file.path}`,
          labels: ["MarkdownDocument", "DocumentCandidate"],
          props: { path: file.path, doc_id: frontmatter.doc_id ?? null },
        });
        const lines = text.split(/\r?\n/);
        const fenced = computeFencedLineMask(lines);
        lines.forEach((lineText, index) => {
          if (fenced[index]) return; // TASK-PRD-007 (W1): no headings, wikilinks, or references from fenced code.
          const heading = lineText.match(/^(#{1,6})\s+(.+)$/);
          if (heading) nodes.push({ id: `markdown:${file.path}:${index + 1}`, labels: ["MarkdownSection", "AtomCandidate"], props: { path: file.path, line: index + 1, depth: heading[1].length, title: heading[2] } });
          const codeStripped = stripInlineCode(lineText);
          for (const match of codeStripped.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
            recordLink({ file, index, label: match[1], relation: "WIKILINK" });
          }
          for (const match of codeStripped.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
            if (/^(?:https?:|mailto:|#)/i.test(match[1])) continue;
            recordLink({ file, index, label: match[1], relation: "REFERENCES" });
          }
        });
      }
      return {
        method: "markdown-document-link-parser",
        nodes,
        edges,
        unresolved_links: unresolved,
      };
    },
    async ({ inventory, workspacePath }) => {
      const files = filesWith(inventory, new Set([".cbl", ".cob", ".cpy"]));
      if (!files.length) return { notApplicable: "inventory_contains_no_cobol" };
      const nodes = [];
      for (const file of files) {
        const text = await readWorkspaceFile(workspacePath, file);
        const program = text.match(/PROGRAM-ID\.\s+([A-Z0-9_-]+)/i);
        if (!program) return { incomplete: `cobol_program_id_not_parsed:${file.path}`, method: "cobol-program-parser" };
        nodes.push({ id: `cobol:${file.path}:${program[1]}`, labels: ["CobolProgram"], props: { path: file.path, name: program[1] } });
      }
      return { method: "cobol-program-parser", nodes };
    },
    async ({ inventory, workspacePath }) => {
      // TASK-PRD-007 (D2): previously bailed with `incomplete` the instant ANY unsupported
      // extension (.py, .java, ...) existed anywhere in the inventory -- before parsing a single
      // TypeScript file. On this repo, 33 .py files blanked out symbols for the entire remaining
      // TypeScript/JavaScript source tree. Now: parse everything this stage CAN parse, and record
      // unsupported extensions plus any per-file AST parse failures as coverage findings via
      // unresolved_links (stage-runner.mjs then submits the candidates found with confidence < 1
      // instead of confidence 1, and MSP sees the coverage gap via the recorded findings).
      const unsupported = filesWith(inventory, unsupportedSymbolicExtensions);
      const { parsed, failures } = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const unresolved_links = [
        ...unsupported.map((file) => ({ source_path: file.path, relation: "UNSUPPORTED_LANGUAGE", target_label: file.extension })),
        ...failures,
      ];
      if (!parsed.length) {
        return unresolved_links.length
          ? { incomplete: `symbolic_parse_coverage_gap:${unresolved_links.length}_files_unparsed`, method: "typescript-ast", unresolved_links }
          : { notApplicable: "inventory_contains_no_supported_symbolic_source" };
      }
      const symbols = [];
      const symbolsByName = new Map();
      for (const { file, source } of parsed) {
        walk(source, (node) => {
          const name = declarationName(node);
          if (!name) return;
          let kind;
          if (ts.isFunctionDeclaration(node)) kind = "function";
          else if (ts.isClassDeclaration(node)) kind = "class";
          else if (ts.isInterfaceDeclaration(node)) kind = "interface";
          else if (ts.isTypeAliasDeclaration(node)) kind = "type";
          else if (ts.isMethodDeclaration(node)) kind = "method";
          if (!kind) return;
          const symbol = { id: `symbol:${file.path}:${node.getStart(source)}`, name, kind, path: file.path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 };
          symbols.push(symbol);
          const existing = symbolsByName.get(name);
          symbolsByName.set(name, existing === undefined ? symbol.id : null);
        });
      }
      const edges = [];
      const edgeKeys = new Set();
      for (const { file, source } of parsed) {
        walk(source, (node) => {
          if (!ts.isCallExpression(node)) return;
          const targetName = ts.isIdentifier(node.expression)
            ? node.expression.text
            : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : null;
          const target = targetName ? symbolsByName.get(targetName) : null;
          if (!target) return;
          const from = nearestNamedSymbol(node, source, file.path);
          if (from === target) return;
          const key = `${from}\u0000${target}\u0000CALLS`;
          if (edgeKeys.has(key)) return;
          edgeKeys.add(key);
          edges.push({ id: `symbol-link-candidate:calls:${file.path}:${node.getStart(source)}`, from, to: target, rel: "CALLS", props: { candidate: true, target_name: targetName } });
        });
      }
      return symbols.length
        ? { method: "typescript-symbol-and-call-ast", symbols, edges, unresolved_links }
        : { incomplete: `symbolic_parse_coverage_gap:${unresolved_links.length}_files_unparsed`, method: "typescript-ast", unresolved_links };
    },
    async ({ inventory, workspacePath }) => {
      // TASK-PRD-007 (D2): shares parseTypeScriptFiles()'s root cause with stages 5, 7, 9, 10 --
      // one unparseable file (traced to ref/src/.../EmployeeCardInteractive.js) used to throw and
      // kill this stage outright. A per-file parse failure now just skips that file and is
      // recorded as a coverage finding; the stage still reports every route it DID find.
      const { parsed, failures } = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const nodes = [];
      for (const { file, source } of parsed) walk(source, (node) => {
        if (isRouteRegistration(node, source)) {
          const call = node.expression.getText(source);
          const routePath = node.arguments[0].text;
          nodes.push({ id: `route:${file.path}:${node.pos}`, labels: ["Route"], props: { path: file.path, call, route: routePath } });
        }
      });
      if (nodes.length) return { method: "typescript-route-ast", nodes, unresolved_links: failures };
      // TASK-PRD-007 (B2, round 3): a repo with genuinely no router (this one -- the sidecar
      // dispatches with `if (url.pathname === ...)`, see scripts/mcp/sidecar-server.mjs) must
      // report that honestly. `incomplete` when parse failures mean coverage is genuinely
      // unknown; `notApplicable` -- not a defect -- when every file parsed cleanly and simply
      // contains no route registration.
      return failures.length
        ? { incomplete: `route_scan_coverage_gap:${failures.length}_files_unparsed`, method: "typescript-route-ast", unresolved_links: failures }
        : { notApplicable: "ast_contains_no_routes" };
    },
    async ({ inventory, workspacePath }) => {
      // TASK-PRD-007 (D2): same shared parseTypeScriptFiles() root cause as stages 5, 6, 9, 10.
      const { parsed, failures } = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const nodes = [];
      for (const { file, source } of parsed) walk(source, (node) => {
        if (ts.isStringLiteral(node) && /^govibe\.[a-z0-9_.-]+$/i.test(node.text)) nodes.push({ id: `tool:${node.text}`, labels: ["Tool"], props: { path: file.path, name: node.text } });
      });
      if (nodes.length) return { method: "typescript-tool-contract-ast", nodes, unresolved_links: failures };
      return failures.length
        ? { incomplete: `tool_contract_scan_coverage_gap:${failures.length}_files_unparsed`, method: "typescript-tool-contract-ast", unresolved_links: failures }
        : { notApplicable: "ast_contains_no_tool_contracts" };
    },
    async ({ inventory, workspacePath }) => {
      // TASK-PRD-007 (F4): the previous heuristic matched ANY path containing "schema" /
      // "model(s)" / "migration(s)" as a path segment -- including markdown docs, JSON
      // registries, and plain prose -- and extracted names with a loose
      // `\b(?:model|entity|table)\s+(\w+)` regex that fires on ordinary English words and DDL
      // keywords (`ALTER TABLE ... ADD`, `CREATE TABLE ... WITHOUT ROWID`), yielding garbage
      // entity names ("ADD", "without", "unexpectedly", "name"). Restrict source files to real
      // schema-definition languages (SQL migration/schema files, Prisma schema files) and extract
      // only from well-formed schema-definition statements (CREATE TABLE <name>, Prisma
      // `model <Name> {`), not from prose or DDL statements that merely mention a table.
      const candidates = inventory.files.filter((file) =>
        (file.extension === ".sql" && /(^|\/)(schema|models?|migrations?)(\/|$)/i.test(path.posix.dirname(file.path)))
        || file.path.toLowerCase().endsWith("schema.prisma"));
      if (!candidates.length) return { notApplicable: "inventory_contains_no_orm_sources" };
      const nodes = [];
      for (const file of candidates) {
        const text = await readWorkspaceFile(workspacePath, file);
        const matches = file.extension === ".sql"
          ? [...text.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`[]?([A-Za-z_][A-Za-z0-9_]*)["'`\]]?/gi)]
          : [...text.matchAll(/^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gim)];
        matches.forEach((match, index) => nodes.push({ id: `orm:${file.path}:${index}`, labels: ["OrmModel"], props: { path: file.path, name: match[1] } }));
      }
      // TASK-PRD-007 (F4): if the tightened, reliable extraction finds nothing, show the honest
      // empty state (DatabaseErdView renders nothing) rather than fall back to the old loose
      // heuristic -- a correct empty ERD beats a wrong table list.
      //
      // TASK-PRD-007 (B4, round 3): this is `incomplete`, not `notApplicable`. `not_applicable`
      // means "the inventory excludes this stage" (stage-runner.mjs's not_applicable branch
      // writes `method: "inventory-exclusion"`, `confidence: 1`, and an MSP evidence batch with
      // `verdict: "passed"`) -- but the exclusion string ITSELF says ORM sources ARE present; the
      // record would contradict its own reason, and it flips validateDeepScan (graph-
      // validation.mjs) into treating a scan that found no reliable schema entities as
      // `complete`. `candidates.length` (real .sql/schema.prisma files, checked above) is
      // present; extraction just found nothing reliable in them -- that is a coverage gap.
      return nodes.length ? { method: "orm-schema-parser", nodes } : { incomplete: "orm_sources_present_but_no_reliable_schema_entities_found", method: "orm-schema-parser" };
    },
    async ({ inventory, workspacePath }) => {
      // TASK-PRD-007 (D2): same shared parseTypeScriptFiles() root cause as stages 5, 6, 7, 10.
      const files = filesWith(inventory, tsExtensions);
      const { parsed, failures } = await parseTypeScriptFiles(workspacePath, files);
      const known = new Set(files.map((file) => file.path));
      const edges = [];
      for (const { file, source } of parsed) {
        for (const statement of source.statements) {
          if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith(".")) continue;
          const base = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), statement.moduleSpecifier.text));
          const target = [base, ...[...tsExtensions].map((extension) => `${base}${extension}`), ...[...tsExtensions].map((extension) => `${base}/index${extension}`)].find((candidate) => known.has(candidate));
          if (target) edges.push({ id: `imports:${file.path}:${target}`, from: `file:${file.path}`, to: `file:${target}`, rel: "IMPORTS", props: { candidate: true } });
        }
      }
      if (edges.length) return { method: "typescript-import-resolution", edges, unresolved_links: failures };
      return failures.length
        ? { incomplete: `import_resolution_coverage_gap:${failures.length}_files_unparsed`, method: "typescript-import-resolution", unresolved_links: failures }
        : { notApplicable: "ast_contains_no_resolved_cross_file_imports" };
    },
    async ({ inventory, workspacePath }) => {
      // TASK-PRD-007 (D2): same shared parseTypeScriptFiles() root cause as stages 5, 6, 7, 9.
      // Additionally, this stage had its OWN all-or-nothing bug independent of the AST parser:
      // any single unresolved heritage clause (a class extending a name this scan couldn't
      // resolve to a known class -- e.g. extending an external/third-party base class) blanked
      // out every INHERITS edge the stage otherwise found. Fixed under the same owner-approved
      // D2 intent: submit the edges found, record unresolved heritage as a coverage finding.
      const { parsed, failures } = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const classes = new Map();
      for (const { file, source } of parsed) walk(source, (node) => {
        if (ts.isClassDeclaration(node) && node.name) {
          const existing = classes.get(node.name.text);
          const id = `symbol:${file.path}:${node.getStart(source)}`;
          classes.set(node.name.text, existing ? null : id);
        }
      });
      const edges = [];
      const unresolvedHeritage = [];
      for (const { file, source } of parsed) walk(source, (node) => {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        for (const clause of node.heritageClauses ?? []) for (const type of clause.types) {
          const baseName = type.expression.getText(source);
          const baseId = classes.get(baseName);
          const derivedId = classes.get(node.name.text);
          if (!baseId || !derivedId) unresolvedHeritage.push({ source_path: file.path, relation: "UNRESOLVED_INHERITANCE", target_label: `${node.name.text}->${baseName}` });
          else edges.push({ id: `inherits:${file.path}:${node.name.text}:${baseName}`, from: derivedId, to: baseId, rel: "INHERITS", props: { candidate: true } });
        }
      });
      const unresolved_links = [...failures, ...unresolvedHeritage];
      if (edges.length) return { method: "typescript-heritage-ast", edges, unresolved_links };
      return unresolved_links.length
        ? { incomplete: `heritage_resolution_coverage_gap:${unresolved_links.length}_unresolved`, method: "typescript-heritage-ast", unresolved_links }
        : { notApplicable: "ast_contains_no_inheritance" };
    },
    ({ inventory }) => inventory.directories.length
      ? { method: "deterministic-directory-communities", communities: inventory.directories.map((directory) => ({ id: `community:${directory}`, label: directory, member_ids: inventory.files.filter((file) => file.path.startsWith(`${directory}/`)).map((file) => `file:${file.path}`).sort() })) }
      : { notApplicable: "inventory_contains_no_communities" },
    async ({ inventory, workspacePath }) => {
      const manifest = inventory.files.find((file) => file.path === "package.json");
      if (!manifest) return { notApplicable: "inventory_contains_no_process_manifest" };
      const packageJson = JSON.parse(await readWorkspaceFile(workspacePath, manifest));
      const processes = Object.keys(packageJson.scripts ?? {}).sort().map((name) => ({ id: `process:package.json:${name}`, name, step_ids: ["file:package.json"] }));
      return processes.length ? { method: "package-script-parser", processes } : { notApplicable: "manifest_contains_no_processes" };
    },
  ];
}
