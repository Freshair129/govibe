#!/usr/bin/env bash
# baseline-check: run the four-stage GoVibe baseline gate with structured failure triage.
# Exit 0 = all green. Exit N = first failing stage number.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 99

run_stage() {
  local n="$1" name="$2"; shift 2
  printf "%s) %s ... " "$n" "$name"
  local out
  if out=$("$@" 2>&1); then
    echo "OK"
  else
    echo "FAIL (exit $?)"
    echo "--- last 30 lines ---"
    echo "$out" | tail -30
    echo "---------------------"
    case "$name" in
      docs:validate)   echo "Hint: edited a governed doc? Run docs-bump skill or revert frontmatter." ;;
      roadmap:validate) echo "Hint: open docs/roadmap/*.md and check the failing Task Container." ;;
      lint)             echo "Hint: tsc strict mode; remove unused imports/vars (don't underscore-prefix)." ;;
      build)            echo "Hint: usually a stale import path or case mismatch in src/." ;;
    esac
    exit "$n"
  fi
}

run_stage 1 docs:validate    npm run --silent docs:validate
run_stage 2 roadmap:validate npm run --silent roadmap:validate
run_stage 3 lint             npm run --silent lint
run_stage 4 build            npm run --silent build

echo ""
echo "✓ baseline-check: all 4 stages passed — pre-commit gate will accept this change."
