import { govibeRuntime } from "./runtime-core.mjs";
import { startSidecarServer } from "./sidecar-server.mjs";
import { handleResourceRead, handleToolCall } from "./handlers.mjs";
import { resourceCatalog, serverInfo, toolCatalog } from "./registry.mjs";

const protocolVersion = "2024-11-05";
let readBuffer = Buffer.alloc(0);

function writeMessage(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  process.stdout.write(Buffer.concat([header, body]));
}

function success(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function failure(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

async function onRequest(message) {
  const { id, method, params } = message;

  try {
    switch (method) {
      case "initialize":
        success(id, {
          protocolVersion,
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
          },
          serverInfo,
        });
        return;
      case "notifications/initialized":
        return;
      case "ping":
        success(id, {});
        return;
      case "tools/list":
        success(id, { tools: toolCatalog });
        return;
      case "resources/list":
        success(id, { resources: resourceCatalog });
        return;
      case "tools/call": {
        const name = params?.name;
        const args = params?.arguments ?? {};
        const result = await handleToolCall(name, args);
        success(id, result);
        return;
      }
      case "resources/read": {
        const uri = params?.uri;
        const result = await handleResourceRead(uri);
        success(id, result);
        return;
      }
      default:
        failure(id ?? null, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    failure(id ?? null, -32000, messageText);
  }
}

function tryReadMessage() {
  const headerSeparator = "\r\n\r\n";
  const separatorIndex = readBuffer.indexOf(headerSeparator);
  if (separatorIndex === -1) {
    return false;
  }

  const headerText = readBuffer.subarray(0, separatorIndex).toString("utf8");
  const contentLengthHeader = headerText
    .split("\r\n")
    .find((line) => line.toLowerCase().startsWith("content-length:"));

  if (!contentLengthHeader) {
    throw new Error("Missing Content-Length header");
  }

  const contentLength = Number(contentLengthHeader.split(":")[1]?.trim());
  if (!Number.isFinite(contentLength)) {
    throw new Error("Invalid Content-Length header");
  }

  const bodyStart = separatorIndex + Buffer.byteLength(headerSeparator);
  const bodyEnd = bodyStart + contentLength;
  if (readBuffer.length < bodyEnd) {
    return false;
  }

  const body = readBuffer.subarray(bodyStart, bodyEnd).toString("utf8");
  readBuffer = readBuffer.subarray(bodyEnd);
  onRequest(JSON.parse(body));
  return true;
}

process.stdin.on("data", (chunk) => {
  readBuffer = Buffer.concat([readBuffer, chunk]);

  try {
    while (tryReadMessage()) {
      // Drain buffered messages.
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    failure(null, -32700, messageText);
  }
});

await govibeRuntime.initialize();
const sidecar = startSidecarServer(govibeRuntime);
govibeRuntime.appendTerminal("sys", `Mission sidecar listening on http://${sidecar.host}:${sidecar.port}`);
