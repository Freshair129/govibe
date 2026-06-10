# Documentation Requirements

Every change must be accompanied by the appropriate documentation tier.

| Change Type | Required Document | Template / Link |
|-------------|-------------------|-----------------|
| **Bug Fix** | `RCA` (Root Cause Analysis) | `standards/RCA-Standard.md` |
| **New Feature** | `Feature Spec` | [Feature-Spec-Template] |
| **Rust IPC / API** | `API Contract` (JSON Spec) | [API-Contract-Template] |
| **Schema Change** | `Migration Plan` | [Migration-Plan-Template] |
| **Architecture** | `ADR` (Architecture Decision Record) | [ADR-Template] |

### Approval Workflow
1. Agent proposes the document.
2. User/Architect reviews and provides "APPROVED".
3. Agent implements code based *strictly* on the approved document.
4. Document version is updated in `GEMINI.md` or `MEMORY.md`.

## CHANGELOG

| Version | Date | Status | Summary |
|---------|------|--------|---------|
