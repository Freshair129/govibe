import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const tsExtensions = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"]);
const unsupportedSymbolicExtensions = new Set([".py", ".java", ".go", ".rs", ".rb", ".php"]);

function filesWith(inventory, extensions) {
  return inventory.files.filter((file) => extensions.has(file.extension));
}

async function readWorkspaceFile(workspacePath, file) {
  return readFile(path.join(workspacePath, file.path), "utf8");
}

async function parseTypeScriptFiles(workspacePath, files) {
  const parsed = [];
  for (const file of files) {
    const text = await readWorkspaceFile(workspacePath, file);
    const kind = file.extension === ".tsx" || file.extension === ".jsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(file.path, text, ts.ScriptTarget.Latest, true, kind);
    if (source.parseDiagnostics.length > 0) {
      throw new Error(`AST parse failed for ${file.path}: ${source.parseDiagnostics[0].messageText}`);
    }
    parsed.push({ file, text, source });
  }
  return parsed;
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
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
      const nodes = [];
      for (const file of files) {
        const text = await readWorkspaceFile(workspacePath, file);
        text.split(/\r?\n/).forEach((line, index) => {
          const heading = line.match(/^(#{1,6})\s+(.+)$/);
          if (heading) nodes.push({ id: `markdown:${file.path}:${index + 1}`, labels: ["MarkdownSection"], props: { path: file.path, line: index + 1, depth: heading[1].length, title: heading[2] } });
        });
      }
      return { method: "markdown-heading-parser", nodes: nodes.length ? nodes : files.map((file) => ({ id: `markdown:${file.path}`, labels: ["MarkdownDocument"], props: { path: file.path } })) };
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
      const unsupported = filesWith(inventory, unsupportedSymbolicExtensions);
      if (unsupported.length) return { incomplete: `unsupported_symbolic_languages:${[...new Set(unsupported.map((file) => file.extension))].join(",")}`, method: "typescript-ast" };
      const parsed = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      if (!parsed.length) return { notApplicable: "inventory_contains_no_supported_symbolic_source" };
      const symbols = [];
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
          if (kind) symbols.push({ id: `symbol:${file.path}:${node.getStart(source)}`, name, kind, path: file.path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
        });
      }
      return symbols.length ? { method: "typescript-ast", symbols } : { incomplete: "supported_sources_contain_no_parsed_symbols", method: "typescript-ast" };
    },
    async ({ inventory, workspacePath }) => {
      const parsed = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const nodes = [];
      for (const { file, source } of parsed) walk(source, (node) => {
        if (ts.isCallExpression(node)) {
          const called = node.expression.getText(source);
          if (/(^|\.)(get|post|put|patch|delete|route|router)$/i.test(called)) nodes.push({ id: `route:${file.path}:${node.pos}`, labels: ["Route"], props: { path: file.path, call: called } });
        }
      });
      return nodes.length ? { method: "typescript-route-ast", nodes } : { notApplicable: "ast_contains_no_routes" };
    },
    async ({ inventory, workspacePath }) => {
      const parsed = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const nodes = [];
      for (const { file, source } of parsed) walk(source, (node) => {
        if (ts.isStringLiteral(node) && /^govibe\.[a-z0-9_.-]+$/i.test(node.text)) nodes.push({ id: `tool:${node.text}`, labels: ["Tool"], props: { path: file.path, name: node.text } });
      });
      return nodes.length ? { method: "typescript-tool-contract-ast", nodes } : { notApplicable: "ast_contains_no_tool_contracts" };
    },
    async ({ inventory, workspacePath }) => {
      const candidates = inventory.files.filter((file) => /(^|\/)(schema|models?|migrations?)(\/|\.|$)/i.test(file.path));
      if (!candidates.length) return { notApplicable: "inventory_contains_no_orm_sources" };
      const nodes = [];
      for (const file of candidates) {
        const text = await readWorkspaceFile(workspacePath, file);
        const matches = [...text.matchAll(/\b(?:model|entity|table)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)];
        matches.forEach((match, index) => nodes.push({ id: `orm:${file.path}:${index}`, labels: ["OrmModel"], props: { path: file.path, name: match[1] } }));
      }
      return nodes.length ? { method: "orm-schema-parser", nodes } : { incomplete: "orm_sources_present_but_unparsed", method: "orm-schema-parser" };
    },
    async ({ inventory, workspacePath }) => {
      const files = filesWith(inventory, tsExtensions);
      const parsed = await parseTypeScriptFiles(workspacePath, files);
      const known = new Set(files.map((file) => file.path));
      const edges = [];
      for (const { file, source } of parsed) {
        for (const statement of source.statements) {
          if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith(".")) continue;
          const base = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), statement.moduleSpecifier.text));
          const target = [base, ...[...tsExtensions].map((extension) => `${base}${extension}`), ...[...tsExtensions].map((extension) => `${base}/index${extension}`)].find((candidate) => known.has(candidate));
          if (target) edges.push({ id: `imports:${file.path}:${target}`, from: `file:${file.path}`, to: `file:${target}`, rel: "IMPORTS" });
        }
      }
      return edges.length ? { method: "typescript-import-resolution", edges } : { notApplicable: "ast_contains_no_resolved_cross_file_imports" };
    },
    async ({ inventory, workspacePath }) => {
      const parsed = await parseTypeScriptFiles(workspacePath, filesWith(inventory, tsExtensions));
      const classes = new Map();
      for (const { file, source } of parsed) walk(source, (node) => {
        if (ts.isClassDeclaration(node) && node.name) {
          const existing = classes.get(node.name.text);
          const id = `symbol:${file.path}:${node.getStart(source)}`;
          classes.set(node.name.text, existing ? null : id);
        }
      });
      const edges = [];
      const unresolved = [];
      for (const { file, source } of parsed) walk(source, (node) => {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        for (const clause of node.heritageClauses ?? []) for (const type of clause.types) {
          const baseName = type.expression.getText(source);
          const baseId = classes.get(baseName);
          const derivedId = classes.get(node.name.text);
          if (!baseId || !derivedId) unresolved.push(`${node.name.text}->${baseName}`);
          else edges.push({ id: `inherits:${file.path}:${node.name.text}:${baseName}`, from: derivedId, to: baseId, rel: "INHERITS" });
        }
      });
      if (unresolved.length) return { incomplete: `unresolved_inheritance:${unresolved.join(",")}`, method: "typescript-heritage-ast" };
      return edges.length ? { method: "typescript-heritage-ast", edges } : { notApplicable: "ast_contains_no_inheritance" };
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
