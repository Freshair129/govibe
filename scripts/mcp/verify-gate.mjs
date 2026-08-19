// Real Definition-of-Done gate. Maps a StEP's declared checks to ACTUAL repo commands and
// runs them — no mock pass/fail. A StEP only advances a task to "done" when these real
// checks pass (honors PRODUCT.md live-data-only + STD-Execution-Governance §10 verification).
//
// Injectable: pass options.runCheck to unit-test without spawning npm.

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Canonical Definition-of-Done checks → the real package.json scripts that prove them.
export const CHECK_COMMANDS = {
  lint: "npm run lint",
  build: "npm run build",
  test: "npm test",
  "docs:validate": "npm run docs:validate",
  "roadmap:validate": "npm run roadmap:validate",
};

function tail(text, max = 2000) {
  const value = String(text ?? "");
  return value.length > max ? value.slice(-max) : value;
}

/** Run one named check as a real process. Returns {name, ok, output}; never throws. */
export async function runCheck(name, options = {}) {
  const command = CHECK_COMMANDS[name];
  if (!command) return { name, ok: false, output: `Unknown Definition-of-Done check: ${name}` };
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      timeout: options.maxMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { name, ok: true, output: tail(stdout || stderr) };
  } catch (error) {
    return { name, ok: false, output: tail(error.stdout || error.stderr || error.message) };
  }
}

/**
 * Evaluate a Definition-of-Done. Runs each declared check (serially — build/test mutate the repo,
 * so they must not race) and returns a pass/fail verdict from the REAL exit codes.
 *
 * TASK-PRD-030 (AUD-06): an empty `checks` array used to verdict "pass" unconditionally — a StEP
 * with a vacuous DoD closed on agent exit-code alone. That is now a fail-closed "vacuous" verdict,
 * distinct from both "pass" and "fail", unless the caller sets `allowEmptyDefinitionOfDone: true`
 * explicitly — a deliberate, visible override rather than a silent default.
 * @param {{checks?: string[], requireAll?: boolean, allowEmptyDefinitionOfDone?: boolean}} definitionOfDone
 * @param {{cwd?: string, maxMs?: number, runCheck?: Function}} [options]
 */
export async function runVerifyGate(definitionOfDone = {}, options = {}) {
  const checks = Array.isArray(definitionOfDone.checks) ? definitionOfDone.checks : [];
  const requireAll = definitionOfDone.requireAll !== false; // default: every check must pass
  const allowEmptyDefinitionOfDone = definitionOfDone.allowEmptyDefinitionOfDone === true;
  const run = options.runCheck ?? ((name) => runCheck(name, options));

  const results = [];
  for (const name of checks) {
    // Serial on purpose: real `build`/`test` touch dist/ and the working tree.
    results.push(await run(name));
  }

  let verdict;
  if (checks.length === 0) {
    // Nothing declared to verify. Fail closed: "vacuous" is not "pass" — the caller must opt in
    // explicitly via allowEmptyDefinitionOfDone to accept an unverified DoD as satisfied.
    verdict = allowEmptyDefinitionOfDone ? "pass" : "vacuous";
  } else {
    verdict = (requireAll ? results.every((r) => r.ok) : results.some((r) => r.ok)) ? "pass" : "fail";
  }

  return { verdict, checks: results, requireAll, empty: checks.length === 0, allowEmptyDefinitionOfDone };
}
