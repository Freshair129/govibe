import http from "node:http";
import { WebSocketServer } from "ws";

import { missionProtocolLimits, validateMissionCommand } from "./mission-protocol.mjs";

class PayloadTooLargeError extends Error {}
class InvalidJsonError extends Error {}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request, maxBytes = missionProtocolLimits.maxRequestBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new PayloadTooLargeError(`Request body exceeds ${maxBytes} bytes.`);
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InvalidJsonError("Malformed JSON request body.");
  }
}

function errorStatus(error) {
  if (error instanceof PayloadTooLargeError) return 413;
  if (error instanceof InvalidJsonError || error?.code === "INVALID_MISSION_COMMAND") return 400;
  return 500;
}

export function startSidecarServer(runtime, options = {}) {
  const port = Number(options.port ?? process.env.GOVIBE_MCP_PORT ?? 4310);
  const host = options.host ?? process.env.GOVIBE_MCP_HOST ?? "127.0.0.1";
  const maxRequestBytes = Number(options.maxRequestBytes ?? process.env.GOVIBE_MCP_MAX_REQUEST_BYTES ?? missionProtocolLimits.maxRequestBytes);

  const server = http.createServer(async (request, response) => {
    if (!request.url) {
      sendJson(response, 404, { error: "missing-url" });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host ?? `${host}:${port}`}`);
    try {
      if (request.method === "OPTIONS") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === "GET" && url.pathname === "/mission/snapshot") {
        const source = url.searchParams.get("source") ?? undefined;
        if (source) await runtime.reloadRoadmap(source);
        sendJson(response, 200, runtime.getSnapshot());
        return;
      }

      if (request.method === "GET" && url.pathname === "/roadmap/sources") {
        sendJson(response, 200, {
          activeSource: runtime.getSnapshot().roadmap?.sourcePath ?? null,
          sources: await runtime.listRoadmapSources(),
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/mission/commands") {
        const body = await readJsonBody(request, maxRequestBytes);
        const command = validateMissionCommand(body);
        const result = await runtime.handleMissionCommand(command);
        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, { error: "not-found", path: url.pathname });
    } catch (error) {
      sendJson(response, errorStatus(error), { error: error instanceof Error ? error.message : String(error) });
    }
  });

  const wss = new WebSocketServer({ server, path: "/mission/ws", maxPayload: maxRequestBytes });
  runtime.subscribe((event) => {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "snapshot", snapshot: runtime.getSnapshot() }));
    socket.on("message", async (message, isBinary) => {
      try {
        if (isBinary) throw new InvalidJsonError("Binary mission commands are not supported.");
        const command = validateMissionCommand(JSON.parse(message.toString("utf8")));
        await runtime.handleMissionCommand(command);
      } catch (error) {
        runtime.appendTerminal("warn", `Mission command rejected: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  server.listen(port, host);
  return { server, wss, port, host, maxRequestBytes };
}
