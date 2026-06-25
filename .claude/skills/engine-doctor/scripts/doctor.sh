#!/usr/bin/env bash
# engine-doctor: probe engine readiness + print next-step hint based on the result.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 99

out=$(node engine/orchestration/orchestrator.mjs doctor 2>&1)
echo "$out"
echo ""

case "$out" in
  *"Ready    : yes"*)
    echo "✓ engine is ready. Next: skill 'engine-run', or:"
    echo "  node engine/hybrid-meter/cli.mjs run \"<task>\" --repo /path/to/your/repo"
    ;;
  *"Ready    : degraded"*)
    echo "⚠ engine is degraded (frontier-only, paid). Runs will not be on-device."
    echo "  To fix: ollama pull qwen3:latest"
    ;;
  *)
    echo "✗ engine is not ready. See the issues above."
    ;;
esac
