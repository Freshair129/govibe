---
title: "RUNBOOK: MSP Validate Evidence Adapter"
doc_id: "RUNBOOK-MSP-VALIDATE-EVIDENCE-ADAPTER"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-16"
owner: "JANUS / KIN"
source_of_truth: true
prd_system: "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md"
  - "docs/architecture/MSP-GKS-Taxonomy-Mapping.md"
---

# RUNBOOK: MSP Validate Evidence Adapter

## 1. Purpose

Collect an MSP/GKS validation evidence packet from an external source repo without importing source docs or treating `msp:validate` as a GoVibe final gate.

## 2. Local Operator Config

Use environment variables or command flags. Do not hardcode local paths into CI or canonical runtime config.

```powershell
$env:MSP_REPO_ROOT="C:\Users\freshair\cognitive_system"
$env:MSP_VALIDATE_COMMAND="npm run msp:validate"
npm run msp:evidence
```

Equivalent explicit invocation:

```powershell
npm run msp:evidence -- --repo "C:\Users\freshair\cognitive_system" --command "npm run msp:validate"
```

## 3. Workflow

1. Codex or local shell checks the source repo path and git status.
2. The adapter runs the configured MSP validation command in the source repo.
3. The adapter captures source commit, source git status, command, exit code, timestamps, MSP result, and mapping status.
4. The adapter prints an evidence packet to stdout.
5. ATHER and LYRA decide whether the packet is reference evidence, inbound material, rejection evidence, or a change-request trigger.

## 4. Decision Policy

- `accept_reference`: source can be cited, but GoVibe validators still decide GoVibe done state.
- `import_inbound`: reserved for a later human-approved import workflow.
- `reject`: source evidence should not be consumed.
- `create_change_request`: source validation failed or revealed mapping work.
- `blocked_by_missing_evidence`: repo, command, or required evidence is unavailable.

## 5. Verification

Run:

```powershell
npm run msp:evidence -- --repo "C:\Users\freshair\cognitive_system"
npm run msp:evidence -- --repo "C:\missing\msp"
npm run docs:validate
```

Expected behavior:

- valid repo returns a packet with `source_git_status`, `exit_code`, and `recommended_decision`
- missing repo returns `blocked_by_missing_evidence`
- `docs:validate` remains the GoVibe documentation gate

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-16 | JANUS / KIN | Added operator workflow for collecting MSP validation evidence without mutating source repos. |
