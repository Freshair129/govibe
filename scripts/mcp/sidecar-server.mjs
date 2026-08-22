import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import {
  boundedProtocolMessage,
  createCommandDedupWindow,
  createCommandResponse,
  isFileSaveMetadata,
  isMissionCommand,
  isMissionEvent,
  isMutatingMissionCommandType,
  MISSION_PROTOCOL_LIMITS,
} from "../../packages/mission-protocol/index.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:1420",
  "http://localhost:1420",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];
const DEFAULT_MAX_BODY_BYTES = MISSION_PROTOCOL_LIMITS.jsonBodyBytes;

function parseAllowedOrigins(value) {
  if (!value) return DEFAULT_ALLOWED_ORIGINS;
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function originAllowed(origin, allowedOrigins) {
  return typeof origin === "string" && allowedOrigins.includes(origin);
}

function tokenMatches(candidate, expected) {
  if (typeof candidate !== "string" || typeof expected !== "string") return false;
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

function readBearerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string") return undefined;
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1];
}

// TASK-PRD-028 (AUD-10b / AUD-32): the WS handshake previously carried the auth token in the
// URL's `?token=` query string, which lands in access logs, browser/proxy history, and
// Referer headers on any subsequent same-origin navigation. RFC 6455's Sec-WebSocket-Protocol
// header is the standard place to carry a credential the browser WebSocket API cannot attach
// as a custom header — the client (src/mission-auth-bootstrap.ts) sends the token base64url-
// encoded as the LAST offered subprotocol so it stays a valid HTTP token (raw secrets can
// contain characters the header grammar forbids).
function decodeWebSocketProtocolToken(value) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

function readWebSocketProtocolToken(request) {
  const header = request.headers["sec-websocket-protocol"];
  if (typeof header !== "string") return undefined;
  const offered = header.split(",").map((part) => part.trim()).filter(Boolean);
  const last = offered.at(-1);
  return last ? decodeWebSocketProtocolToken(last) : undefined;
}

// Review-gate hardening: by default `ws` echoes back whichever subprotocol the client offered
// (here, the token-carrying one — see readWebSocketProtocolToken above) in the 101 response's
// Sec-WebSocket-Protocol header, so the credential would round-trip into that response header
// too (some reverse proxies log response headers). The client always offers this fixed,
// non-secret sentinel ALONGSIDE the encoded token (src/mission-auth-bootstrap.ts), so the
// server can select and echo IT instead — a real subprotocol negotiation the strict `ws`
// client library accepts (it errors if the server names a protocol the client never offered,
// or omits the header entirely when the client offered one) without ever reflecting the token.
export const WS_ECHO_SUBPROTOCOL = "govibe-mission-control";

function selectEchoSubprotocol(offeredProtocols) {
  return offeredProtocols.has(WS_ECHO_SUBPROTOCOL) ? WS_ECHO_SUBPROTOCOL : false;
}

function sendJson(response, statusCode, payload, origin, allowedOrigins) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (originAllowed(origin, allowedOrigins)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,X-GoVibe-File-Hash,X-GoVibe-File-Meta";
  }
  response.writeHead(statusCode, headers);
  response.end(statusCode === 204 ? undefined : JSON.stringify(payload));
}

async function readBoundedBody(request, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("Request body too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(request, maxBytes) {
  const body = await readBoundedBody(request, maxBytes);
  if (body.length === 0) return {};
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    const error = new Error("Malformed JSON request body.");
    error.statusCode = 400;
    throw error;
  }
}

function readFileMetadata(request) {
  const hash = request.headers["x-govibe-file-hash"];
  const encodedMeta = request.headers["x-govibe-file-meta"];
  if (typeof hash !== "string" || hash.length === 0 || hash.length > MISSION_PROTOCOL_LIMITS.idChars || typeof encodedMeta !== "string") {
    return undefined;
  }
  try {
    const meta = JSON.parse(Buffer.from(encodedMeta, "base64url").toString("utf8"));
    return isFileSaveMetadata(meta) ? { hash, meta } : undefined;
  } catch {
    return undefined;
  }
}

function commandIdFrom(body) {
  return typeof body?.commandId === "string" && body.commandId.length > 0
    ? body.commandId
    : crypto.randomUUID();
}

// Review-gate finding 033-B: a commandId this function had to MINT (the client sent none)
// can, by construction, never be delivered twice by a retrying/reconnecting client — the
// client never had that id to resend. Caching it would only ever waste one LRU slot per
// unlabelled command, for no dedup benefit; a bursty client omitting commandId could evict
// genuinely-dedupable entries. Only a commandId the client actually supplied is eligible.
function isClientSuppliedCommandId(body) {
  return typeof body?.commandId === "string" && body.commandId.length > 0;
}

// Review-gate finding 033-C: keying the dedup window on commandId alone let two different
// command TYPES that happened to share a commandId (e.g. a client bug, or two independent
// callers minting from the same pool) hand each other's cached acknowledgement to the wrong
// command. The command's own type is part of the identity of "this exact mutation, once".
function dedupKeyFor(command, commandId) {
  return `${command.type}:${commandId}`;
}

function commandPayload(body) {
  if (!body || typeof body !== "object") return body;
  const { commandId: _commandId, ...command } = body;
  return command;
}

export function startSidecarServer(runtime, options = {}) {
  const port = Number(options.port ?? process.env.GOVIBE_MCP_PORT ?? 4310);
  const host = options.host ?? process.env.GOVIBE_MCP_HOST ?? "127.0.0.1";
  const authToken = options.authToken ?? process.env.GOVIBE_MCP_TOKEN;
  const allowedOrigins = options.allowedOrigins ?? parseAllowedOrigins(process.env.GOVIBE_MCP_ALLOWED_ORIGINS);
  const maxBodyBytes = Number(options.maxBodyBytes ?? process.env.GOVIBE_MCP_MAX_BODY_BYTES ?? DEFAULT_MAX_BODY_BYTES);

  if (!authToken) throw new Error("GOVIBE_MCP_TOKEN is required to start the Mission Control sidecar.");
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error("GOVIBE_MCP_MAX_BODY_BYTES must be a positive integer.");
  }

  // TASK-PRD-033 (AUD-18): one dedup window shared by BOTH transports (HTTP and WS) below, so a
  // mutating commandId delivered twice — whether the duplicate arrives over the same transport
  // or the other one (e.g. an HTTP timeout followed by a WS reconnect replay) — applies at most
  // once. Read-shaped commands (IDEMPOTENT_RETRY_COMMAND_TYPES) are never cached here: the
  // gateway deliberately retries those with the same commandId expecting a fresh execution.
  const commandDedup = options.commandDedup ?? createCommandDedupWindow();

  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (!request.url) {
      sendJson(response, 404, { error: "missing-url" }, origin, allowedOrigins);
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host ?? `${host}:${port}`}`);
    try {
      if (request.method === "OPTIONS") {
        if (!originAllowed(origin, allowedOrigins)) {
          sendJson(response, 403, { error: "origin-not-allowed" }, origin, allowedOrigins);
          return;
        }
        sendJson(response, 204, {}, origin, allowedOrigins);
        return;
      }

      if (!originAllowed(origin, allowedOrigins)) {
        sendJson(response, 403, { error: "origin-not-allowed" }, origin, allowedOrigins);
        return;
      }
      if (!tokenMatches(readBearerToken(request), authToken)) {
        sendJson(response, 401, { error: "unauthorized" }, origin, allowedOrigins);
        return;
      }

      if (request.method === "GET" && url.pathname === "/mission/snapshot") {
        const source = url.searchParams.get("source") ?? undefined;
        if (source) await runtime.reloadRoadmap(source);
        sendJson(response, 200, runtime.getSnapshot(), origin, allowedOrigins);
        return;
      }

      if (request.method === "GET" && url.pathname === "/roadmap/sources") {
        sendJson(response, 200, {
          activeSource: runtime.getSnapshot().roadmap?.sourcePath ?? null,
          sources: await runtime.listRoadmapSources(),
        }, origin, allowedOrigins);
        return;
      }

      if (request.method === "POST" && url.pathname === "/usage/ingest") {
        const body = await readJsonBody(request, maxBodyBytes);
        try {
          const result = runtime.ingestUsageData(body);
          sendJson(response, 200, result, origin, allowedOrigins);
        } catch (error) {
          sendJson(response, 400, { error: boundedProtocolMessage(error) }, origin, allowedOrigins);
        }
        return;
      }

      if (request.method === "GET" && url.pathname === "/usage/snapshot") {
        sendJson(response, 200, runtime.getUsageSnapshot(), origin, allowedOrigins);
        return;
      }

      if (request.method === "GET" && url.pathname === "/usage/history") {
        const days = Number(url.searchParams.get("days") ?? 7);
        sendJson(response, 200, runtime.getUsageHistory(days), origin, allowedOrigins);
        return;
      }

      if (request.method === "POST" && url.pathname === "/mission/commands") {
        const body = await readJsonBody(request, maxBodyBytes);
        const commandId = commandIdFrom(body);
        const clientSuppliedCommandId = isClientSuppliedCommandId(body);
        const command = commandPayload(body);
        if (!isMissionCommand(command) || command.type === "file.save") {
          sendJson(response, 400, createCommandResponse({
            commandId,
            ok: false,
            message: "Mission command failed protocol validation.",
          }), origin, allowedOrigins);
          return;
        }
        // TASK-PRD-033 (AUD-18): a duplicate delivery of a mutating command (client retry or
        // reconnect replay carrying the same commandId) returns the original acknowledgement
        // instead of re-executing runtime.handleMissionCommand. The cached outcome shape
        // ({ok, message?, result?}) is transport-agnostic, so a command executed on one
        // transport and replayed on the other still renders a correctly-shaped response.
        // Review-gate finding 033-A: the cache never stores `snapshot` — a replay attaches a
        // FRESH runtime.getSnapshot() so the client's view is never rolled back to whatever
        // state existed at the moment of the original execution.
        const dedupEligible = isMutatingMissionCommandType(command.type);
        const dedupKey = dedupKeyFor(command, commandId);
        if (dedupEligible && commandDedup.has(dedupKey)) {
          const cached = commandDedup.get(dedupKey);
          sendJson(response, cached.ok ? 200 : 500, createCommandResponse({
            commandId,
            ok: cached.ok,
            ...(cached.ok ? { result: cached.result, snapshot: runtime.getSnapshot() } : { message: cached.message }),
          }), origin, allowedOrigins);
          return;
        }
        try {
          const result = await runtime.handleMissionCommand(command);
          // 033-B: only a client-supplied commandId is ever cached — a minted one can never
          // be replayed with the same id, so caching it would only waste an LRU slot.
          if (dedupEligible && clientSuppliedCommandId) commandDedup.set(dedupKey, { ok: true, result });
          sendJson(response, 200, createCommandResponse({ commandId, ok: true, result, snapshot: runtime.getSnapshot() }), origin, allowedOrigins);
        } catch (error) {
          const message = boundedProtocolMessage(error);
          if (dedupEligible && clientSuppliedCommandId) commandDedup.set(dedupKey, { ok: false, message });
          sendJson(response, 500, createCommandResponse({ commandId, ok: false, message }), origin, allowedOrigins);
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/mission/files") {
        const file = readFileMetadata(request);
        if (!file) {
          sendJson(response, 400, { error: "Invalid file transfer metadata." }, origin, allowedOrigins);
          return;
        }
        const data = await readBoundedBody(request, Math.min(maxBodyBytes, MISSION_PROTOCOL_LIMITS.fileBytes));
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const command = { type: "file.save", hash: file.hash, data: arrayBuffer, meta: file.meta };
        if (!isMissionCommand(command)) {
          sendJson(response, 400, { error: "File transfer failed protocol validation." }, origin, allowedOrigins);
          return;
        }
        const result = await runtime.handleMissionCommand(command);
        sendJson(response, 200, createCommandResponse({
          commandId: crypto.randomUUID(),
          ok: true,
          result,
          snapshot: runtime.getSnapshot(),
        }), origin, allowedOrigins);
        return;
      }

      sendJson(response, 404, { error: "not-found", path: url.pathname }, origin, allowedOrigins);
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      sendJson(response, statusCode, { error: boundedProtocolMessage(error) }, origin, allowedOrigins);
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: maxBodyBytes, handleProtocols: (protocols) => selectEchoSubprotocol(protocols) });
  server.on("upgrade", (request, socket, head) => {
    const origin = request.headers.origin;
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
    if (!originAllowed(origin, allowedOrigins) || !tokenMatches(readWebSocketProtocolToken(request), authToken)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (url.pathname !== "/mission/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (webSocket) => wss.emit("connection", webSocket, request));
  });

  runtime.subscribe((event) => {
    if (!isMissionEvent(event)) {
      runtime.appendTerminal("warn", "Mission event failed protocol validation and was not published.");
      return;
    }
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  });

  wss.on("connection", (socket) => {
    // TASK-PRD-007 (round 5): the connect frame goes through the SAME isMissionEvent gate the
    // broadcast path above uses. It used to be sent unchecked, which made the ceiling asymmetric
    // and the failure hard to read: src/mission/gateway.ts's handleRawFrame() validates every
    // inbound frame, so an oversized snapshot was already being discarded by the client with a
    // generic "failed Mission Control schema validation" line and nothing server-side to explain
    // it. And the snapshot frame is the EARLIER of the two ceilings to break -- it is a strict
    // superset of the `graph.update` payload (measured on this repository: an 869,491-byte snapshot
    // frame against a 667,348-byte graph.update), so a deep scan large enough to blackhole live
    // graph updates has already blackholed the connect frame. Reporting the measured size here is
    // what keeps that diagnosable instead of silent on both ends.
    const snapshotFrame = { type: "snapshot", snapshot: runtime.getSnapshot() };
    if (!isMissionEvent(snapshotFrame)) {
      runtime.appendTerminal(
        "warn",
        `Mission snapshot frame failed protocol validation and was not sent to a connecting client (${Buffer.byteLength(JSON.stringify(snapshotFrame), "utf8")} bytes, against a MISSION_PROTOCOL_LIMITS.eventBytes ceiling of ${MISSION_PROTOCOL_LIMITS.eventBytes}). The client would have discarded it on arrival.`,
      );
    } else {
      socket.send(JSON.stringify(snapshotFrame));
    }
    socket.on("message", async (message, isBinary) => {
      if (isBinary) {
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId: crypto.randomUUID(),
          ok: false,
          message: "Binary mission command frames are not supported.",
        }));
        return;
      }

      let body;
      try {
        body = JSON.parse(message.toString("utf8"));
      } catch {
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId: crypto.randomUUID(),
          ok: false,
          message: "Mission command frame was not valid JSON.",
        }));
        return;
      }

      const commandId = commandIdFrom(body);
      const clientSuppliedCommandId = isClientSuppliedCommandId(body);
      const command = commandPayload(body);
      if (!isMissionCommand(command) || command.type === "file.save") {
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId,
          ok: false,
          message: "Mission command failed protocol validation.",
        }));
        return;
      }

      // TASK-PRD-033 (AUD-18): shares the same dedup window as the HTTP handler above (same
      // transport-agnostic cached outcome shape, keyed by dedupKeyFor — 033-C), so a mutating
      // commandId already applied via one transport is not re-applied via the other. 033-A: no
      // `snapshot` is cached — a replay always attaches a fresh runtime.getSnapshot().
      const dedupEligible = isMutatingMissionCommandType(command.type);
      const dedupKey = dedupKeyFor(command, commandId);
      if (dedupEligible && commandDedup.has(dedupKey)) {
        const cached = commandDedup.get(dedupKey);
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId,
          ok: cached.ok,
          ...(cached.ok ? { snapshot: runtime.getSnapshot() } : { message: cached.message }),
        }));
        return;
      }

      try {
        const result = await runtime.handleMissionCommand(command);
        // 033-B: only cache a client-supplied commandId — a minted one is never replayable.
        if (dedupEligible && clientSuppliedCommandId) commandDedup.set(dedupKey, { ok: true, result });
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId,
          ok: true,
          snapshot: runtime.getSnapshot(),
        }));
      } catch (error) {
        const messageText = boundedProtocolMessage(error);
        runtime.appendTerminal("warn", `Mission command failed: ${messageText}`);
        if (dedupEligible && clientSuppliedCommandId) commandDedup.set(dedupKey, { ok: false, message: messageText });
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId,
          ok: false,
          message: messageText,
        }));
      }
    });
  });

  server.listen(port, host);
  return { server, wss, port, host, allowedOrigins, maxBodyBytes };
}
