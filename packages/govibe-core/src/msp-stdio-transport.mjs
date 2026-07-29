import { spawn } from "node:child_process";

function encode(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"), body]);
}

export function createMspStdioCaller({ command, args = [], cwd, env = process.env }) {
  if (!command) throw new Error("MSP command is required.");
  const child = spawn(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], shell: false });
  let buffer = Buffer.alloc(0);
  let nextId = 1;
  let initialized;
  const pending = new Map();

  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const separator = buffer.indexOf("\r\n\r\n");
      if (separator < 0) break;
      const header = buffer.subarray(0, separator).toString("utf8");
      const match = header.match(/content-length:\s*(\d+)/i);
      if (!match) throw new Error("MSP response is missing Content-Length.");
      const start = separator + 4;
      const end = start + Number(match[1]);
      if (buffer.length < end) break;
      const message = JSON.parse(buffer.subarray(start, end).toString("utf8"));
      buffer = buffer.subarray(end);
      const request = pending.get(message.id);
      if (!request) continue;
      pending.delete(message.id);
      clearTimeout(request.timeout);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
  });
  child.on("error", (error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    pending.clear();
  });
  child.on("exit", (code) => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(new Error(`MSP process exited with code ${code}.`));
    }
    pending.clear();
  });

  function request(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MSP request timed out: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timeout });
      child.stdin.write(encode({ jsonrpc: "2.0", id, method, params }));
    });
  }

  async function ensureInitialized() {
    if (!initialized) {
      initialized = request("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "govibe-core", version: "0.1.0" },
      }).then(() => child.stdin.write(encode({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })));
    }
    await initialized;
  }

  return async (name, input) => {
    await ensureInitialized();
    const result = await request("tools/call", { name, arguments: input });
    const text = result?.content?.find((item) => item.type === "text")?.text;
    if (result?.isError) throw new Error(text ?? `${name} failed.`);
    return result?.structuredContent ?? (text ? JSON.parse(text) : {});
  };
}
