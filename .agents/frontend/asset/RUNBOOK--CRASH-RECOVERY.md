---
id: RUNBOOK--CRASH-RECOVERY
tier: master
created_at: 2026-05-29T03:11:52.721+07:00
phase: 4
type: runbook
status: active
vault_id: covibe
title: Benchmark Crash Recovery Guide
tags: [runbook, recovery, ops]
domain: infrastructure
crosslinks:
  used_by: []
  references: []
linked_symbols: []
---

# RUNBOOK — Benchmark Crash Recovery

> Asset classification: historical benchmark/process reference. This remains useful for local recovery workflows around Ollama benchmarking, but it is not default context for normal Mission Control frontend microtasks.

## Trigger
A benchmark campaign halts unexpectedly, Ollama stops responding, or the system experiences a TDR driver reset.

## Sequence (Recovery Steps)

1. **Kill Hanging Processes:**
   - Execute `kill_ports.bat` to clear hanging Node/Python processes.
   - Alternatively, open Task Manager and force-kill `ollama_llama_server.exe`.

2. **Verify Hardware State:**
   - Run `nvidia-smi` to ensure VRAM is successfully freed (should be near 0 MB used by Ollama).
   - If GPU state is corrupted (Error code in nvidia-smi), restart the host machine.

3. **Restart Ollama:**
   - Restart the Ollama tray application.
   - Run `ollama list` to verify the daemon is healthy.

4. **Resume Campaign:**
   - Use the recovery script (`scripts/run_csb_01_recovery.py`) to target only the failed models.
