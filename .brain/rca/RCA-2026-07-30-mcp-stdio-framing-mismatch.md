---
version: "1.0.0"
created_at: "2026-07-30T15:26:00+07:00,ATHER"
last_update: "2026-07-30T15:26:00+07:00,ATHER"
status: "active"
attributes:
  domain: "runtime-integration"
  scope: "GoVibe-to-MSP-GKS-stdio"
---

# RCA: MCP stdio framing mismatch

## Symptom

A live `gks_code_upsert` request from GoVibe to the merged cognitive_system MCP server timed out during `initialize`.

## Evidence

- GoVibe `msp-stdio-transport.mjs` writes and parses HTTP-style `Content-Length` frames.
- cognitive_system uses `@modelcontextprotocol/sdk` `StdioServerTransport`.
- The installed SDK `serializeMessage` emits `JSON.stringify(message) + "\n"`, and its `ReadBuffer` waits for a newline.
- A clean-install live request timed out after 15 seconds at `initialize`; the cognitive process remained alive.

## Root Cause

The client and server implement different stdio message boundaries. The server waits for a newline that the GoVibe client never sends, while the client waits for a `Content-Length` response the server never emits.

## Why the issue escaped detection

Unit tests mocked `callTool` and CI verified each repository independently. No integration test connected the real GoVibe transport to an SDK stdio server.

## Proposed prevention

- Encode and parse newline-delimited JSON-RPC to match the MCP SDK.
- Add a transport contract test that rejects `Content-Length` framing.
- Keep a clean-checkout live writer smoke in the cutover gate.

## CHANGELOG

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 1.0.0 | 2026-07-30 | active | Confirmed live stdio framing mismatch and prevention test. | pending | ATHER |
