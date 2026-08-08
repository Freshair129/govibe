# SPEC-GoVibe-IDE-Plugin-Slash-Commands: IDE Plugin and Slash Command Specifications

**Status:** `PROPOSAL`  
**Doc ID:** `SPEC-GV-IDE-PLUGIN`  
**Version:** `0.1.0`  
**Updated:** `2026-08-08`  
**Owner:** `THESEUS / Boss`  

---

## 1. Concept
Integrating GoVibe directly into the developer's IDE (via an IDE Plugin, MCP Server, or Slash Commands in AI Chat interfaces like Cursor, Windsurf, or Claude) creates a seamless developer experience. 

Instead of jumping between terminal commands and markdown files, developers and AI agents can query and enforce GoVibe's governance model directly inside the chat interface using `/gv-*` commands.

---

## 2. Proposed Slash Commands List

### 2.1 Workspace & Environment (`/gv-setup`)
*   **`/gv-init`**
    *   *Usage:* `/gv-init [path]`
    *   *Purpose:* Runs the workspace initialization sequence. Creates `.govibe/`, `.govibe-knowledge-block/`, `local_model/`, and default template files.
*   **`/gv-validate`** (or `/gv-status`)
    *   *Usage:* `/gv-validate`
    *   *Purpose:* Runs directory structure and git-governance checks (runs `validate-env.mjs`). Reports missing components, invalid specs, or security rules leak risks.

### 2.2 Knowledge Graph & Atoms (`/gv-knowledge`)
*   **`/gv-scan`**
    *   *Usage:* `/gv-scan [stage]`
    *   *Purpose:* Triggers the 12-stage scan of the workspace. Can run all 12 stages or target a specific stage (e.g., `/gv-scan symbolic`).
*   **`/gv-verify`**
    *   *Usage:* `/gv-verify`
    *   *Purpose:* Scans the `.govibe-knowledge-block/` directory, compiles the graph, and runs structural and LLM semantic orphan validation (runs `gks-benchmark.mjs`).
*   **`/gv-add-atom`**
    *   *Usage:* `/gv-add-atom <category>` (e.g. `/gv-add-atom adr` with cursor selection)
    *   *Purpose:* Extracts the selected code or text block in the editor and creates a new Knowledge Atom `.md` file inside `.govibe-knowledge-block/<category>/` with auto-generated YAML metadata.

### 2.3 Audit & Traceability (`/gv-governance`)
*   **`/gv-impact`**
    *   *Usage:* `/gv-impact <atom_id>` (e.g., `/gv-impact [[ARCH-001]]`)
    *   *Purpose:* Performs backlink analysis on the specified atom. Identifies which files, configurations, and sibling atoms will be impacted if this atom is modified.
*   **`/gv-audit`**
    *   *Usage:* `/gv-audit`
    *   *Purpose:* Audits active SWE docs and code changes to ensure all tasks map to an approved decision and have valid QA evidence.

### 2.4 Model Telemetry (`/gv-telemetry`)
*   **`/gv-model-state`**
    *   *Usage:* `/gv-model-state [model_tag]`
    *   *Purpose:* Displays cumulative performance statistics from the model's `state.json` (Total tasks, success rate, time elapsed, and hardware context).
*   **`/gv-sync-models`**
    *   *Usage:* `/gv-sync-models`
    *   *Purpose:* Rescans local Ollama instance and updates parameters inside `local_model/`.

---

## 3. Visual Workflow (IDE Chat Integration)

When a developer types `/` in their AI chat, the autocomplete menu displays the commands:

```text
/gv-init          Initialize GoVibe workspace environment
/gv-validate      Verify workspace directory compliance
/gv-verify        Run graph walk & semantic verification
/gv-impact        Analyze code impact chain for an atom
/gv-add-atom      Extract active selection into a GKS Atom
/gv-model-state   Show metrics/benchmarks for local models
```

---

## 4. Integration Approach
Since GoVibe uses **MCP (Model Context Protocol)** at its core, this plugin should be packaged as an **MCP Server**. 
- The MCP Server exposes these commands as **Tools** and **Prompts**.
- Any IDE supporting MCP (like Claude Desktop, Cursor, or VSCode MCP clients) will automatically populate these slash commands and tools into the AI chat interface.
