import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import {
  boundedProtocolMessage,
  createCommandResponse,
  isFileSaveMetadata,
  isMissionCommand,
  isMissionEvent,
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
        const command = commandPayload(body);
        if (!isMissionCommand(command) || command.type === "file.save") {
          sendJson(response, 400, createCommandResponse({
            commandId,
            ok: false,
            message: "Mission command failed protocol validation.",
          }), origin, allowedOrigins);
          return;
        }
        try {
          const result = await runtime.handleMissionCommand(command);
          sendJson(response, 200, createCommandResponse({
            commandId,
            ok: true,
            result,
            snapshot: runtime.getSnapshot(),
          }), origin, allowedOrigins);
        } catch (error) {
          sendJson(response, 500, createCommandResponse({
            commandId,
            ok: false,
            message: boundedProtocolMessage(error),
          }), origin, allowedOrigins);
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

  const wss = new WebSocketServer({ noServer: true, maxPayload: maxBodyBytes });
  server.on("upgrade", (request, socket, head) => {
    const origin = request.headers.origin;
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
    if (!originAllowed(origin, allowedOrigins) || !tokenMatches(url.searchParams.get("token"), authToken)) {
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
    socket.send(JSON.stringify({ type: "snapshot", snapshot: runtime.getSnapshot() }));
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

      try {
        await runtime.handleMissionCommand(command);
        socket.send(JSON.stringify({
          type: "command.ack",
          commandId,
          ok: true,
          snapshot: runtime.getSnapshot(),
        }));
      } catch (error) {
        const messageText = boundedProtocolMessage(error);
        runtime.appendTerminal("warn", `Mission command failed: ${messageText}`);
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
