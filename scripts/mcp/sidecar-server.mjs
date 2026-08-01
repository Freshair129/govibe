import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:1420",
  "http://localhost:1420",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

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
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
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
  response.end(JSON.stringify(payload));
}

function requireTrustedOrigin(request, allowedOrigins) {
  return originAllowed(request.headers.origin, allowedOrigins);
}

function requireHttpAuth(request, expectedToken) {
  return tokenMatches(readBearerToken(request), expectedToken);
}

function requireWebSocketAuth(request, expectedToken) {
  const url = new URL(request.url ?? "/mission/ws", `http://${request.headers.host ?? "localhost"}`);
  return tokenMatches(url.searchParams.get("token"), expectedToken);
}

export function startSidecarServer(runtime, options = {}) {
  const port = Number(options.port ?? process.env.GOVIBE_MCP_PORT ?? 4310);
  const host = options.host ?? process.env.GOVIBE_MCP_HOST ?? "127.0.0.1";
  const authToken = options.authToken ?? process.env.GOVIBE_MCP_TOKEN;
  const allowedOrigins = options.allowedOrigins ?? parseAllowedOrigins(process.env.GOVIBE_MCP_ALLOWED_ORIGINS);

  if (!authToken) {
    throw new Error("GOVIBE_MCP_TOKEN is required to start the Mission Control sidecar.");
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
        if (!requireTrustedOrigin(request, allowedOrigins)) {
          sendJson(response, 403, { error: "origin-not-allowed" }, origin, allowedOrigins);
          return;
        }
        sendJson(response, 204, {}, origin, allowedOrigins);
        return;
      }

      if (!requireTrustedOrigin(request, allowedOrigins)) {
        sendJson(response, 403, { error: "origin-not-allowed" }, origin, allowedOrigins);
        return;
      }

      if (!requireHttpAuth(request, authToken)) {
        sendJson(response, 401, { error: "unauthorized" }, origin, allowedOrigins);
        return;
      }

      if (request.method === "GET" && url.pathname === "/mission/snapshot") {
        const source = url.searchParams.get("source") ?? undefined;
        if (source) {
          await runtime.reloadRoadmap(source);
        }
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
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const result = await runtime.handleMissionCommand(body);
        sendJson(response, 200, result, origin, allowedOrigins);
        return;
      }

      sendJson(response, 404, { error: "not-found", path: url.pathname }, origin, allowedOrigins);
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) }, origin, allowedOrigins);
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    if (!requireTrustedOrigin(request, allowedOrigins) || !requireWebSocketAuth(request, authToken)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
    if (url.pathname !== "/mission/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (webSocket) => {
      wss.emit("connection", webSocket, request);
    });
  });

  runtime.subscribe((event) => {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "snapshot", snapshot: runtime.getSnapshot() }));
    socket.on("message", async (message) => {
      try {
        await runtime.handleMissionCommand(JSON.parse(message.toString("utf8")));
      } catch (error) {
        runtime.appendTerminal("warn", `Mission command failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  server.listen(port, host);
  return { server, wss, port, host, allowedOrigins };
}
