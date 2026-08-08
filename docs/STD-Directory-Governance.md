# STD-Directory-Governance: GoVibe Directory Structure Standard

**Status:** `APPROVED`  
**Doc ID:** `STD-DIR-GOVERNANCE`  
**Version:** `1.0.0`  
**Updated:** `2026-08-08`  
**Owner:** `THESEUS / Boss`  

---

## 1. Overview
GoVibe governs multi-agent development by maintaining a strict boundary between:
1. **Global Configuration / Persona**: Stored in the user's home directory (`~/.govibe/`).
2. **Local Agent Identity (Episodic Memory)**: Stored in `<workspace>/.govibe/`. Excluded from Git (`.gitignore`).
3. **Local Models Configuration**: Stored in `<workspace>/local_model/`. Excluded from Git (`.gitignore`).
4. **Project Knowledge Graph (Knowledge Atoms)**: Stored in `<workspace>/.govibe-knowledge-block/`. Tracked in Git.

---

## 2. Directory Specifications

### 2.1 Global Directory (`~/.govibe/` or `C:\Users\<user>\.govibe\`)
This directory holds configuration shared across multiple workspaces on the host machine.

```text
~/.govibe/
├── machine_profile.json      # Host Hardware Spec, Network Info, and machine_id
```

### 2.2 Local Workspace Configuration (`<workspace>/.govibe/`)
This contains the agent's episodic memory and private workspace snapshots. This folder **MUST** be added to `.gitignore`.

```text
<workspace>/.govibe/
├── brain/
│   ├── skills/               # Custom skills/tools compiled for the agent in this workspace
│   ├── rca/                  # Root Cause Analysis logs of mistakes in this workspace
│   ├── sessions/             # Execution/turn snapshots and raw replays
│   └── MEMORY.md             # Durable custom rules (e.g. VRAM limits) and major decisions
```

### 2.3 Local Model Configurations (`<workspace>/local_model/`)
Stores the profiles and model YAML configurations for Ollama models available on this machine. This folder **MUST** be added to `.gitignore`.

```text
<workspace>/local_model/
├── auto_scanned_models.json  # Manifest of scanned Ollama models
└── <model_name>/
    └── <quantization>/
        └── <model_name>_config.yaml  # Specific model parameters and routing configs
```

### 2.4 Knowledge Atoms (`<workspace>/.govibe-knowledge-block/`)
Stores structured markdown files representing Knowledge Atoms extracted from human SWE docs. This directory **MUST** be tracked by Git.

```text
<workspace>/.govibe-knowledge-block/
├── SCHEMA.md                 # Definitions, YAML rules and linking guidelines
├── adr/                      # Architectural Decision Records
├── api/                      # API Contracts
├── architecture/             # Architecture Atoms
├── data-model/               # Data Domain/Entity mappings
├── domain/                   # Business Domain rules
├── feature/                  # Feature requirements
├── report/                   # Verification report summaries and LLM logs
├── spec/                     # Technical specifications
└── templates/                # Reusable document templates
```

---

## 3. Enforcement (Validation)
Enforcement is automated via `scripts/docs/validate-env.mjs`.

The validator is integrated into `package.json` scripts:
- `npm run env:validate`: Verify workspace structure conformance.
- Part of `npm run baseline:check` to ensure correctness before push.

Any missing directories or files required for standard execution will trigger a validation failure.
