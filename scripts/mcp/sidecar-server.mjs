import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import {
  boundedProtocolMessage,
  createCommandResponse,
  isMissionCommand,
} from "../../packages/mission-protocol/index.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:1420",
  "http://localhost:1420",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];
const DEFAULT_MAX_BODY_BYTES = 1_000_000;

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
    headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type";
  }
  response.writeHead(statusCode, headers);
  response.end(statusCode === 204 ? undefined : JSON.stringify(payload));
}

async function readJsonBody(request, maxBytes) {
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
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Malformed JSON request body.");
    error.statusCode = 400;
    throw error;
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

      if (request.method === "POST" && url.pathname === "/mission/commands") {
        const body = await readJsonBody(request, maxBodyBytes);
        const commandId = commandIdFrom(body);
        const command = commandPayload(body);
        if (!isMissionCommand(command)) {
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
      if (!isMissionCommand(command)) {
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
