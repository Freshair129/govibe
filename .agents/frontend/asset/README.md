# Frontend Agent Asset Boundary

This folder mixes several kinds of material. Treat them differently.

## 1. Live worker guidance

These files are the preferred references for the current GoVibe frontend worker flow:

- `GUIDE--SMALL-MODEL-PROMPTING.md`

These may be loaded directly by the parent orchestrator or a bounded local worker when relevant.

## 2. Reference concepts for orchestrators only

These documents are useful background, but they are not the default read set for a small frontend worker:

- `BLUEPRINT--CODEGEN-MICROTASK-RUNNER.md`
- `CONCEPT--CODEGEN-MICROTASK-CONTRACT.md`
- `CONCEPT--CODEGEN-MICROTASK-RUNNER.md`
- `CONCEPT--SUBAGENT-CONTEXT-SCOPING.md`
- `FEAT--SRS-INTELLIGENT-PIPELINE.md`
- `RUNBOOK--CRASH-RECOVERY.md`
- `SPEC--SRS-PIPELINE-INTERFACE.md`
- `TDD--INTEL-PIPELINE-SRS.md`

Use them as design or process inspiration, not as mandatory runtime truth for A2 Mission Control work.

## 3. Local evidence and generated artifacts

These directories are local benchmark or telemetry evidence and should not be treated as live agent context by default:

- `benchmark-run/`
- `results/`
- `telemetry_logs/`

They are useful for investigation, benchmarking, or postmortem review, but they are noisy for day-to-day frontend microtasks.

## 4. Helper material

These directories may contain reusable local utilities or templates, but they are not automatically part of the worker prompt:

- `scripts/`
- `templates/`

Load them only when a task explicitly needs benchmarking, recovery, or artifact-format details.

## 5. Default loading rule

For local small-model frontend work:

1. Start with `.agents/frontend/AGENT.md`
2. Load the active context packet from `.agents/frontend/context/`
3. Load `GUIDE--SMALL-MODEL-PROMPTING.md`
4. Stop there unless the current microtask explicitly requires more

If a task needs historical benchmark evidence, the parent orchestrator should opt in deliberately instead of dumping the entire folder into context.
