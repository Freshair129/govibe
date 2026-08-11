import path from "node:path";
import ts from "typescript";

import { MODE2_STAGES } from "./stage-contract.mjs";
import { agenticStages } from "./stages-agentic.mjs";
import { behaviourStages } from "./stages-behaviour.mjs";
import { interfaceStages } from "./stages-interface.mjs";
import { semanticStages } from "./stages-semantic.mjs";
import { verificationStages } from "./stages-verification.mjs";
import {
  byCodepoint,
  isTestPath,
  parseSource,
  TS_EXTENSIONS,
  UNSUPPORTED_SOURCE_EXTENSIONS,
  walk,
} from "./stage-shared.mjs";

/**
 * Stage definitions for the Mode 2 semantic deep scan.
 *
 * Each stage declares:
 *   inputs(files)  — the files whose *content* it depends on, so the pipeline can decide
 *                    whether a prior record may be reused verbatim.
 *   usesTreeShape  — whether adding or removing a file invalidates it.
 *   run(context)   — the extraction itself.
 *
 * Extraction precedence is deterministic parser > repository metadata > static analysis >
 * structured extraction > graph traversal > LLM inference. No stage in this tranche uses
 * inference; meaning that cannot be extracted deterministically is reported as unresolved,
 * never invented.
 */

const PACKAGE_MANAGERS = [
  { file: "package-lock.json", name: "npm" },
  { file: "pnpm-lock.yaml", name: "pnpm" },
  { file: "yarn.lock", name: "yarn" },
  { file: "bun.lockb", name: "bun" },
  { file: "poetry.lock", name: "poetry" },
  { file: "requirements.txt", name: "pip" },
  { file: "Cargo.lock", name: "cargo" },
  { file: "go.sum", name: "go-modules" },
  { file: "Gemfile.lock", name: "bundler" },
  { file: "composer.lock", name: "composer" },
];

const BUILD_SYSTEMS = [
  { file: "vite.config.ts", name: "vite" },
  { file: "vite.config.js", name: "vite" },
  { file: "webpack.config.js", name: "webpack" },
  { file: "rollup.config.js", name: "rollup" },
  { file: "turbo.json", name: "turborepo" },
  { file: "nx.json", name: "nx" },
  { file: "Makefile", name: "make" },
  { file: "Cargo.toml", name: "cargo" },
  { file: "go.mod", name: "go" },
  { file: "pom.xml", name: "maven" },
  { file: "build.gradle", name: "gradle" },
  { file: "pyproject.toml", name: "python-build" },
];

const MONOREPO_SIGNALS = ["pnpm-workspace.yaml", "lerna.json", "nx.json", "turbo.json", "rush.json"];

const FRAMEWORK_SIGNALS = {
  react: "react",
  "react-native": "react-native",
  next: "nextjs",
  vue: "vue",
  svelte: "svelte",
  "@angular/core": "angular",
  express: "express",
  fastify: "fastify",
  "@nestjs/core": "nestjs",
  koa: "koa",
  "@modelcontextprotocol/sdk": "mcp",
  prisma: "prisma",
  typeorm: "typeorm",
  mongoose: "mongoose",
  vitest: "vitest",
  jest: "jest",
  "@playwright/test": "playwright",
};

const DOC_ROOTS = ["docs", "doc", "documentation"];
const GENERATED_PATH_SIGNALS = [/(^|\/)generated(\/|$)/i, /(^|\/)__generated__(\/|$)/i, /\.generated\./i, /(^|\/)vendor(\/|$)/i, /\.min\.(js|css)$/i];

function languageHistogram(files) {
  const histogram = {};
  for (const file of files) {
    const key = file.extension || "[no-extension]";
    histogram[key] = (histogram[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(histogram).sort(([left], [right]) => byCodepoint(left, right)));
}

function classifyArtifact(file) {
  const filePath = file.path;
  if (GENERATED_PATH_SIGNALS.some((pattern) => pattern.test(filePath))) {
    return /(^|\/)vendor(\/|$)/i.test(filePath) ? "vendor" : "generated";
  }
  if (/(^|\/)(\.github\/workflows|\.gitlab-ci\.yml|\.circleci|azure-pipelines\.yml|Jenkinsfile)/i.test(filePath)) return "ci-cd";
  if (/(^|\/)(terraform|infra|infrastructure|deploy|k8s|kubernetes|helm)(\/|$)/i.test(filePath) || /(Dockerfile|docker-compose\.ya?ml)$/i.test(filePath)) return "infrastructure";
  if (/(^|\/)(migrations?)(\/|$)/i.test(filePath)) return "migration";
  if (/(^|\/)(schemas?)(\/|$)/i.test(filePath) || /\.(prisma|graphql|gql|proto|avsc)$/i.test(filePath)) return "schema";
  if (/(^|\/)(security|\.governance)(\/|$)/i.test(filePath) || /SECURITY\.md$/i.test(filePath)) return "security";
  if (/(^|\/)(\.claude|\.gemini|\.agents|\.rwang)(\/|$)/i.test(filePath) || /(^|\/)(AGENTS?|CLAUDE|GEMINI)\.md$/i.test(filePath)) return "agent-configuration";
  if (isTestPath(filePath)) return "test";
  if (/(^|\/)(adr|architecture)(\/|$)/i.test(filePath)) return "architecture";
  if (/(^|\/)(api)(\/|$)/i.test(filePath) || /openapi\.(ya?ml|json)$/i.test(filePath)) return "api";
  if (DOC_ROOTS.some((root) => filePath.startsWith(`${root}/`)) || file.extension === ".md" || file.extension === ".mdx") return "documentation";
  if (/\.(json|ya?ml|toml|ini|env|conf|config\.[a-z]+)$/i.test(filePath) || /(^|\/)(tsconfig|package|\.eslintrc|\.prettierrc)[^/]*$/i.test(filePath)) return "config";
  if (/\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|mp4|mp3|pdf)$/i.test(filePath)) return "asset";
  if (TS_EXTENSIONS.has(file.extension) || UNSUPPORTED_SOURCE_EXTENSIONS.has(file.extension) || /\.(c|h|cpp|hpp|sql|sh|ps1)$/i.test(filePath)) return "source";
  return "unknown";
}

/**
 * Distinguishes what an exported `const` actually is. `export const X = () => {}` is a function
 * in every sense that matters to a reader, and `export const NAMES = [...]` is an enum in
 * practice — recording both as a bare "variable" would lose the distinction that makes an
 * exported constant a recognisable capability surface.
 */
function variableKind(declaration) {
  const initializer = declaration.initializer;
  if (!initializer) return "variable";
  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return "function";
  if (ts.isClassExpression(initializer)) return "class";
  if (ts.isArrayLiteralExpression(initializer)) return "const-list";
  if (ts.isObjectLiteralExpression(initializer)) return "const-record";
  // `Object.freeze([...])` / `Object.freeze({...})` is the governed-enum idiom in this codebase.
  if (ts.isCallExpression(initializer) && /(^|\.)freeze$/.test(initializer.expression.getText?.() ?? "")) {
    const inner = initializer.arguments?.[0];
    if (inner && ts.isArrayLiteralExpression(inner)) return "const-list";
    if (inner && ts.isObjectLiteralExpression(inner)) return "const-record";
  }
  return "variable";
}

function pendingStage(stage, tranche) {
  return {
    stage,
    extractorVersion: "0.0.0",
    method: "not-implemented",
    usesTreeShape: false,
    inputs: () => [],
    async run() {
      return {
        status: "incomplete",
        confidence: 0,
        error: `stage_not_implemented_before_tranche_${tranche}`,
        artifact: null,
      };
    },
  };
}

/** Stage 1 — Workspace Discovery. Every detection cites the file that produced it. */
const stage01 = {
  stage: 1,
  extractorVersion: "1.0.0",
  method: "repository-signal-detection",
  usesTreeShape: true,
  inputs: (files) => files.filter((file) => /^[^/]+$/.test(file.path) && /\.(json|ya?ml|toml|lock|mod|sum)$/i.test(file.path)).map((file) => file.path),
  async run({ adapter, identity, files, directories, read, unreadable = [] }) {
    const present = new Set(files.map((file) => file.path));
    const detections = [];
    const detect = (kind, name, evidence) => detections.push({ kind, name, evidence });

    for (const candidate of PACKAGE_MANAGERS) if (present.has(candidate.file)) detect("package-manager", candidate.name, candidate.file);
    for (const candidate of BUILD_SYSTEMS) if (present.has(candidate.file)) detect("build-system", candidate.name, candidate.file);

    const unresolved = [];
    let manifest = null;
    if (present.has("package.json")) {
      try {
        manifest = JSON.parse(await read("package.json"));
      } catch (error) {
        unresolved.push({ kind: "unparsed-manifest", path: "package.json", reason: String(error?.message ?? error) });
      }
    }
    if (manifest) {
      const dependencies = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies };
      for (const [dependency, framework] of Object.entries(FRAMEWORK_SIGNALS)) {
        if (Object.hasOwn(dependencies, dependency)) detect("framework", framework, "package.json");
      }
    }

    const monorepoEvidence = MONOREPO_SIGNALS.filter((signal) => present.has(signal));
    if (Array.isArray(manifest?.workspaces) || manifest?.workspaces?.packages) monorepoEvidence.push("package.json#workspaces");

    let git = null;
    try {
      const info = await adapter.stat(".git");
      git = { present: true, kind: info.isDirectory ? "directory" : "file" };
    } catch {
      git = { present: false, kind: null };
    }

    const instructions = await adapter.discoverInstructions();
    const documentationRoots = DOC_ROOTS.filter((root) => directories.includes(root));
    const generatedPaths = files.filter((file) => GENERATED_PATH_SIGNALS.some((pattern) => pattern.test(file.path))).map((file) => file.path);

    for (const entry of unreadable) unresolved.push({ kind: "unreadable-directory", path: entry.path, code: entry.code });

    return {
      status: "complete",
      confidence: manifest || detections.length ? 1 : 0.5,
      unresolved,
      artifact: {
        schema: "govibe-mode2-workspace-manifest/v1",
        workspace_root: identity.workspace_root,
        client: identity.client,
        workspace_mode: identity.workspace_mode,
        write_policy: identity.write_policy,
        languages: languageHistogram(files),
        package_managers: detections.filter((item) => item.kind === "package-manager"),
        build_systems: detections.filter((item) => item.kind === "build-system"),
        frameworks: detections.filter((item) => item.kind === "framework"),
        monorepo: { detected: monorepoEvidence.length > 0, evidence: monorepoEvidence.sort() },
        git,
        configuration_families: files.filter((file) => /^[^/]+\.(json|ya?ml|toml|ini)$/i.test(file.path)).map((file) => file.path),
        agent_instruction_files: instructions,
        documentation_roots: documentationRoots,
        generated_paths: generatedPaths,
        unreadable_paths: unreadable,
        file_count: files.length,
        directory_count: directories.length,
      },
    };
  },
};

/** Stage 2 — File & Artifact Inventory. Deterministic classification before any inference. */
const stage02 = {
  stage: 2,
  extractorVersion: "1.0.0",
  method: "deterministic-artifact-classification",
  usesTreeShape: true,
  inputs: () => [],
  async run({ files, exclusions }) {
    const classified = files.map((file) => ({ ...file, classification: classifyArtifact(file) }));
    const counts = {};
    for (const file of classified) counts[file.classification] = (counts[file.classification] ?? 0) + 1;
    const unknown = classified.filter((file) => file.classification === "unknown");
    return {
      status: "complete",
      confidence: files.length === 0 ? 1 : 1 - unknown.length / files.length,
      unresolved: unknown.map((file) => ({ kind: "unclassified-artifact", path: file.path })),
      artifact: {
        schema: "govibe-mode2-artifact-inventory/v1",
        exclusions,
        counts: Object.fromEntries(Object.entries(counts).sort(([left], [right]) => byCodepoint(left, right))),
        semantic_scope: classified.filter((file) => file.classification !== "generated" && file.classification !== "vendor").map((file) => file.path),
        files: classified,
      },
    };
  },
};

/** Stage 3 — Structural scan. Parsers only; unparsed languages are named, never guessed at. */
const stage03 = {
  stage: 3,
  // 1.1.0 — RCA-2026-08-12 CA-02: exported variable declarations are now extracted. The bump
  // matters operationally: the pipeline keys stage reuse on extractorVersion, so every cached
  // stage-3 record is correctly invalidated rather than silently retained.
  extractorVersion: "1.1.0",
  method: "typescript-ast-structural-extraction",
  usesTreeShape: false,
  dependsOnStages: [2],
  inputs: (files) => files.filter((file) => TS_EXTENSIONS.has(file.extension)).map((file) => file.path),
  async run({ files, read, artifacts }) {
    const inventory = artifacts.get(2);
    const inScope = new Set(inventory?.semantic_scope ?? files.map((file) => file.path));
    const supported = files.filter((file) => TS_EXTENSIONS.has(file.extension) && inScope.has(file.path));
    const unsupported = files.filter((file) => UNSUPPORTED_SOURCE_EXTENSIONS.has(file.extension) && inScope.has(file.path));

    if (!supported.length && !unsupported.length) {
      return { status: "not_applicable", confidence: 1, exclusions: ["inventory_contains_no_parsable_source"], artifact: null };
    }

    const modules = [];
    const symbols = [];
    const unresolved = [];

    for (const file of supported) {
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
      const exports = [];
      walk(source, (node) => {
        // Variable declarations carry their `export` modifier on the enclosing
        // VariableStatement, not on the declaration, so they need their own branch. Without it
        // every exported constant in a codebase is invisible — const-as-enum, schema tables,
        // policy maps, and arrow-function exports alike (RCA-2026-08-12 RC-1).
        if (ts.isVariableStatement(node)) {
          const exportedStatement = Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
          // Module scope only. A local const inside a function body is an implementation
          // detail, and admitting them would bury the API surface in noise.
          const moduleScope = node.parent === source || ts.isModuleBlock(node.parent ?? {});
          if (!exportedStatement && !moduleScope) return;
          for (const declaration of node.declarationList.declarations) {
            if (!declaration.name || !ts.isIdentifier(declaration.name)) continue;
            const start = declaration.getStart(source);
            const position = source.getLineAndCharacterOfPosition(start);
            symbols.push({
              id: `mode2-symbol:${file.path}:${start}`,
              name: declaration.name.text,
              kind: variableKind(declaration),
              exported: exportedStatement,
              path: file.path,
              source_span: { start, line: position.line + 1, character: position.character + 1 },
            });
            if (exportedStatement) exports.push(declaration.name.text);
          }
          return;
        }
        const name = node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
        if (!name) return;
        let kind;
        if (ts.isFunctionDeclaration(node)) kind = "function";
        else if (ts.isClassDeclaration(node)) kind = "class";
        else if (ts.isInterfaceDeclaration(node)) kind = "interface";
        else if (ts.isTypeAliasDeclaration(node)) kind = "type";
        else if (ts.isMethodDeclaration(node)) kind = "method";
        else if (ts.isEnumDeclaration(node)) kind = "enum";
        if (!kind) return;
        const exported = Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
        const start = node.getStart(source);
        const position = source.getLineAndCharacterOfPosition(start);
        symbols.push({
          id: `mode2-symbol:${file.path}:${start}`,
          name,
          kind,
          exported,
          path: file.path,
          source_span: { start, line: position.line + 1, character: position.character + 1 },
        });
        if (exported) exports.push(name);
      });
      modules.push({ id: `mode2-module:${file.path}`, path: file.path, exports: exports.sort() });
    }

    const unsupportedExtensions = [...new Set(unsupported.map((file) => file.extension))].sort();
    for (const extension of unsupportedExtensions) {
      unresolved.push({ kind: "unsupported-language", extension, files: unsupported.filter((file) => file.extension === extension).length });
    }

    const parsedRatio = supported.length + unsupported.length === 0 ? 1 : supported.length / (supported.length + unsupported.length);
    return {
      status: unsupportedExtensions.length ? "incomplete" : "complete",
      error: unsupportedExtensions.length ? `unsupported_languages:${unsupportedExtensions.join(",")}` : undefined,
      confidence: Number(parsedRatio.toFixed(4)),
      unresolved,
      artifact: {
        schema: "govibe-mode2-structure-model/v1",
        parser_coverage: { parsed_files: supported.length, unparsed_files: unsupported.length, unsupported_extensions: unsupportedExtensions },
        modules,
        symbols,
      },
    };
  },
};

/** Stage 4 — Dependency graph. Unclassifiable edges are kept as unknown, never dropped. */
const stage04 = {
  stage: 4,
  extractorVersion: "1.0.0",
  method: "import-resolution-and-manifest-dependencies",
  usesTreeShape: false,
  dependsOnStages: [2, 3],
  inputs: (files) => [
    ...files.filter((file) => TS_EXTENSIONS.has(file.extension)).map((file) => file.path),
    ...files.filter((file) => path.posix.basename(file.path) === "package.json").map((file) => file.path),
  ],
  async run({ files, read, artifacts }) {
    const inventory = artifacts.get(2);
    const classification = new Map((inventory?.files ?? []).map((file) => [file.path, file.classification]));
    const inScope = new Set(inventory?.semantic_scope ?? files.map((file) => file.path));
    const sourceFiles = files.filter((file) => TS_EXTENSIONS.has(file.extension) && inScope.has(file.path));
    const manifests = files.filter((file) => path.posix.basename(file.path) === "package.json" && inScope.has(file.path));

    if (!sourceFiles.length && !manifests.length) {
      return { status: "not_applicable", confidence: 1, exclusions: ["inventory_contains_no_dependency_sources"], artifact: null };
    }

    const known = new Set(sourceFiles.map((file) => file.path));
    const edges = [];
    const unresolved = [];
    const seen = new Set();

    const addEdge = (edge) => {
      const key = `${edge.from} ${edge.to} ${edge.kind}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(edge);
    };

    for (const file of sourceFiles) {
      let source;
      try {
        source = parseSource(file.path, await read(file.path));
      } catch (error) {
        unresolved.push({ kind: "unparsed-source", path: file.path, reason: String(error?.message ?? error) });
        continue;
      }
      const specifiers = [];
      for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          specifiers.push({ text: statement.moduleSpecifier.text, typeOnly: Boolean(statement.importClause?.isTypeOnly) });
        }
        if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          specifiers.push({ text: statement.moduleSpecifier.text, typeOnly: Boolean(statement.isTypeOnly) });
        }
      }
      for (const specifier of specifiers) {
        if (!specifier.text.startsWith(".")) {
          addEdge({
            id: `mode2-dep:${file.path}->${specifier.text}`,
            from: `mode2-module:${file.path}`,
            to: `mode2-package:${specifier.text}`,
            rel: "DEPENDS_ON",
            kind: specifier.typeOnly ? "compile-time" : "runtime",
            candidate: true,
            evidence: { path: file.path, specifier: specifier.text },
          });
          continue;
        }
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), specifier.text));
        const target = [base, ...[...TS_EXTENSIONS].map((extension) => `${base}${extension}`), ...[...TS_EXTENSIONS].map((extension) => `${base}/index${extension}`)].find((candidate) => known.has(candidate));
        if (!target) {
          unresolved.push({ kind: "unresolved-import", path: file.path, specifier: specifier.text });
          continue;
        }
        const testEdge = classification.get(file.path) === "test" || isTestPath(file.path);
        addEdge({
          id: `mode2-dep:${file.path}->${target}`,
          from: `mode2-module:${file.path}`,
          to: `mode2-module:${target}`,
          rel: "IMPORTS",
          kind: testEdge ? "test" : specifier.typeOnly ? "compile-time" : "runtime",
          candidate: true,
          evidence: { path: file.path, specifier: specifier.text },
        });
      }
    }

    const packages = [];
    for (const file of manifests) {
      let manifest;
      try {
        manifest = JSON.parse(await read(file.path));
      } catch (error) {
        unresolved.push({ kind: "unparsed-manifest", path: file.path, reason: String(error?.message ?? error) });
        continue;
      }
      const name = manifest.name ?? file.path;
      packages.push({ id: `mode2-package:${name}`, name, path: file.path });
      for (const [group, kind] of [["dependencies", "runtime"], ["devDependencies", "tooling"], ["peerDependencies", "compile-time"]]) {
        for (const dependency of Object.keys(manifest[group] ?? {})) {
          addEdge({
            id: `mode2-dep:${name}->${dependency}:${kind}`,
            from: `mode2-package:${name}`,
            to: `mode2-package:${dependency}`,
            rel: "DEPENDS_ON",
            kind,
            candidate: true,
            evidence: { path: file.path, group },
          });
        }
      }
    }

    const unknownEdges = edges.filter((edge) => edge.kind === "unknown").length;
    return {
      status: "complete",
      confidence: edges.length === 0 ? 1 : Number((1 - (unresolved.length + unknownEdges) / (edges.length + unresolved.length)).toFixed(4)),
      unresolved,
      artifact: {
        schema: "govibe-mode2-dependency-graph/v1",
        packages: packages.sort((left, right) => byCodepoint(left.id, right.id)),
        edges: edges.sort((left, right) => byCodepoint(left.id, right.id)),
        edge_kinds: [...new Set(edges.map((edge) => edge.kind))].sort(),
      },
    };
  },
};

export function createMode2Stages() {
  return [
    stage01,
    stage02,
    stage03,
    stage04,
    ...interfaceStages,
    ...behaviourStages,
    ...verificationStages,
    ...agenticStages,
    ...semanticStages,
  ]
    .sort((left, right) => left.stage - right.stage)
    .map((stage) => ({ ...stage, name: MODE2_STAGES[stage.stage - 1] }));
}
