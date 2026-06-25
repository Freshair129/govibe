// Per-language local model routing (TASK-HYB-RM-007) — unit tests. Deterministic, no LLM.
// Run: node --test engine/orchestration/routing.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeLang, detectPrimaryLang, pickLocalModel } from "./routing.mjs";

test("normalizeLang canonicalizes stack hints", () => {
  assert.equal(normalizeLang("Rust (Cargo)"), "rust");
  assert.equal(normalizeLang("Node:app, React"), "typescript");
  assert.equal(normalizeLang("Python"), "python");
  assert.equal(normalizeLang("golang"), "go");
  assert.equal(normalizeLang(""), "default");
});

test("detectPrimaryLang reads the primary language from a summarizeRepo() stack line", () => {
  assert.equal(detectPrimaryLang("stack: Rust (Cargo), Tauri  |  root: x"), "rust");
  assert.equal(detectPrimaryLang("stack: Node:app, React  |  root: x"), "typescript");
  assert.equal(detectPrimaryLang("stack: Python  |  root: x"), "python");
});

test("pickLocalModel routes by language, falls back to default, null when unconfigured", () => {
  const cfg = { localModelByLang: { rust: "ollama:rust-coder", default: "ollama:qwen3" } };
  assert.equal(pickLocalModel("rust", cfg), "ollama:rust-coder");
  assert.equal(pickLocalModel("elixir", cfg), "ollama:qwen3");       // fallback to default
  assert.equal(pickLocalModel("rust", {}), null);                     // unconfigured
});
