# User Acceptance Testing (UAT) Plan - GoVibe Phase 3/4

## Objective
To verify that the integrated features (GenesisBlockDB, Overlays, UI Polish) meet functional and aesthetic requirements defined in the PRD.

## Test Scenarios

### 1. Functional Verification
- [ ] **Symbol Explorer**: Verify symbols are listed correctly from GenesisBlockDB via IPC.
- [ ] **Debugger Terminal**: Verify querying a test symbol returns the expected JSON data.
- [ ] **Floating Terminal**: Verify WebSocket logs stream correctly and the terminal is draggable.
- [ ] **HITL Modal**: Verify the modal triggers on command and handle confirmation/cancellation correctly.

### 2. Aesthetic/Interaction Verification
- [ ] **GlassPanel**: Verify interactive 3D tilt effect on hover for main cards.
- [ ] **System State**: Verify UI responsiveness and absence of console errors during interaction.

## Acceptance Criteria
- All functional tests pass in `cargo tauri dev`.
- IPC communication is stable.
- UI component behavior strictly follows the design system (`packages/ui`).
- No regressions in navigation or core dashboard logic.
