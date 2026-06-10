# Complexity-Based Execution (C-Scale)

GoVibe tasks are classified by complexity to determine the required documentation and review depth.

## 🟢 C-1: Direct Implementation
**Workflow**: Text → Code (Hotfix Mode)
- **Use for**: Typos, minor syntax errors, basic lint fixes, or trivial CSS tweaks.
- **Risk**: Low.
- **Approval**: Automatic after verification.

## 🔵 C-2: Documentation-Driven (Standard)
**Workflow**: Text → Doc → Code
- **Use for**: New UI components, business logic updates, or state management changes.
- **Required**: `Feature Spec` or `RCA`.
- **Approval**: Boss/Architect must approve the Spec before any code is written.

## 🔴 C-3: Architecture-Driven (Critical)
**Workflow**: Text → Doc → Diagram → Code
- **Use for**: Rust IPC changes, GenesisBlockDB integration, core data migrations, or cross-domain routing logic.
- **Required**: `Spec`, `Architecture Diagram` (Mermaid), `API Contract`.
- **Approval**: Formal architecture review required.

---
### Escalation Rule
If a task identified as C-1 reveals unexpected dependencies or side effects, it **must** be escalated to C-2 immediately. Never downgrade complexity without justification.
