import http from "node:http";
import { WebSocketServer } from "ws";
import {
  boundedProtocolMessage,
  createCommandResponse,
  isMissionCommand,
} from "../../packages/mission-protocol/index.js";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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
        if (source) {
          await runtime.reloadRoadmap(source);
        }
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
        const body = await readJsonBody(request);
        const commandId = commandIdFrom(body);
        const command = commandPayload(body);
        if (!isMissionCommand(command)) {
          sendJson(response, 400, createCommandResponse({
            commandId,
            ok: false,
            message: "Mission command failed protocol validation.",
          }));
          return;
        }
        try {
          const result = await runtime.handleMissionCommand(command);
          sendJson(response, 200, createCommandResponse({
            commandId,
            ok: true,
            result,
            snapshot: runtime.getSnapshot(),
          }));
        } catch (error) {
          sendJson(response, 500, createCommandResponse({
            commandId,
            ok: false,
            message: boundedProtocolMessage(error),
          }));
        }
        return;
      }

      sendJson(response, 404, { error: "not-found", path: url.pathname });
    } catch (error) {
      sendJson(response, 500, { error: boundedProtocolMessage(error) });
    }
  });

  const wss = new WebSocketServer({ server, path: "/mission/ws" });
  runtime.subscribe((event) => {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "snapshot", snapshot: runtime.getSnapshot() }));
    socket.on("message", async (message) => {
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
  return { server, wss, port, host };
}
