# TDD: Phase 2 — Desktop Integration (Tauri IPC)

**Feature ID:** `GV-S200`
**Status:** `PROPOSED`
**Reference:** [PRD-GoVibe-Platform-Overview.md], [SDD-System-Design.md]

## 1. Overview
Implementation details for bridging the React frontend with the Rust backend in the Tauri desktop application. This phase focuses on real-time telemetry, terminal execution, and GenesisBlockDB connectivity.

## 2. Architectural Design
The integration follows a "Command-Listener" pattern:
- **Frontend**: Invokes Tauri commands for actions (e.g., `execute_command`) and listens for emitted events (e.g., `telemetry-update`).
- **Backend**: Handles CPU-intensive tasks and system-level access, emitting state updates back to the frontend.

## 3. Implementation Details

### 3.1 Rust Backend (src-tauri)
We will implement the following commands in `lib.rs`:
- `get_telemetry`: Returns current system stats (CPU, RAM, Disk).
- `run_mission_command`: Dispatches commands to the system or GenesisBlockDB.
- `sync_mission_state`: Initial handshake to sync the frontend with the current backend state.

#### Dependencies
- `sysinfo`: For real-time telemetry.
- `serde`: For serialization.

### 3.2 Core Gateway Integration (@govibe/core)
Update `MissionDataGateway` to support `tauri` transport:
- Use `@tauri-apps/api/core` `invoke`.
- Use `@tauri-apps/api/event` `listen` for async updates.

```typescript
// Proposed extension to MissionDataGateway
if (isTauri()) {
  listen("mission-event", (event) => this.handleEvent(event.payload));
}
```

### 3.3 GenesisBlockDB Interface
A dedicated Rust module `genesis` will handle:
- AST parsing and indexing.
- HNSW (Hierarchical Navigable Small World) for vector-based symbol searching.
- Exposing a `genesis_query` command to the frontend.

## 4. Acceptance Criteria
- [ ] React Dashboard displays real-time CPU/RAM telemetry from Rust.
- [ ] Terminal input in UI successfully triggers a Tauri command and returns output.
- [ ] `MissionDataGateway` automatically detects Tauri environment and switches transport.
- [ ] System stability is maintained (verified by `npm run build`).

## 5. Risk Assessment
- **Risk**: IPC overhead for high-frequency telemetry.
- **Mitigation**: Throttle telemetry updates to 1Hz or use `tauri::Window::emit_filter`.

## 6. Definition of Done
- TDD Approved.
- Implementation completed.
- Unit tests for Gateway Tauri transport.
- E2E verification in the Tauri dev window.
