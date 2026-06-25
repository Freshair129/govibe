#!/usr/bin/env bash
# docs-bump: wrap scripts/docs/bump-doc.mjs with input validation + post-bump verification.
# Usage: docs-bump.sh <file.md> <patch|minor|major> "<summary>"
set -u
cd "$(git rev-parse --show-toplevel)" || exit 99

file="${1:-}"; level="${2:-patch}"; summary="${3:-}"
if [ -z "$file" ] || [ -z "$summary" ]; then
  echo "usage: bump.sh <file.md> <patch|minor|major> \"<summary>\""; exit 1
fi
if [ ! -f "$file" ]; then
  echo "ERROR: file not found: $file"; exit 1
fi
if ! grep -q '^## Changelog' "$file"; then
  echo "ERROR: $file has no '## Changelog' section — bump-doc.mjs requires one."
  echo "       Add it before retrying (see .claude/skills/docs-bump/references/changelog-template.md)."
  exit 1
fi
case "$level" in patch|minor|major) ;; *) echo "ERROR: level must be patch|minor|major (got: $level)"; exit 1 ;; esac

today="$(node -e 'console.log(new Date().toISOString().slice(0,10))')"
node scripts/docs/bump-doc.mjs "$file" "--$level" --updated "$today" --summary "$summary"
bump_exit=$?
if [ "$bump_exit" -ne 0 ]; then echo "bump-doc.mjs exited $bump_exit"; exit "$bump_exit"; fi

echo ""
echo "=== verifying docs:validate accepts the bump ==="
npm run --silent docs:validate 2>&1 | tail -2
if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  echo "✗ docs:validate FAILED after bump — investigate before staging."; exit 2
fi
echo ""
echo "✓ docs-bump: $file bumped and validated."
echo "  Next: git add $file docs/DOC-VERSION-REGISTRY.md"
