import { spawn } from "node:child_process";

const requiredTools = [
  "govibe.agent.run",
  "govibe.docs.resolve",
  "govibe.roadmap.load",
  "govibe.roadmap.update",
  "govibe.deploy.vercel",
];

function encodeMessage(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"),
    body,
  ]);
}

function createMcpClient() {
  const child = spawn(process.execPath, ["scripts/mcp/govibe-mcp-server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      GOVIBE_MCP_PORT: "0",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let nextId = 1;
  let readBuffer = Buffer.alloc(0);
  let stderr = "";
  const pending = new Map();

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.stdout.on("data", (chunk) => {
    readBuffer = Buffer.concat([readBuffer, chunk]);
    drainMessages();
  });

  child.on("exit", (code) => {
    for (const { reject } of pending.values()) {
      reject(new Error(`MCP server exited with code ${code}. ${stderr}`.trim()));
    }
    pending.clear();
  });

  function drainMessages() {
    const separator = "\r\n\r\n";
    while (true) {
      const separatorIndex = readBuffer.indexOf(separator);
      if (separatorIndex === -1) return;

      const headerText = readBuffer.subarray(0, separatorIndex).toString("utf8");
      const contentLengthHeader = headerText
        .split("\r\n")
        .find((line) => line.toLowerCase().startsWith("content-length:"));
      if (!contentLengthHeader) {
        throw new Error("MCP response is missing Content-Length header.");
      }

      const contentLength = Number(contentLengthHeader.split(":")[1]?.trim());
      const bodyStart = separatorIndex + Buffer.byteLength(separator);
      const bodyEnd = bodyStart + contentLength;
      if (readBuffer.length < bodyEnd) return;

      const body = readBuffer.subarray(bodyStart, bodyEnd).toString("utf8");
      readBuffer = readBuffer.subarray(bodyEnd);
      const message = JSON.parse(body);
      const deferred = pending.get(message.id);
      if (!deferred) continue;
      pending.delete(message.id);
      if (message.error) {
        deferred.reject(new Error(message.error.message));
      } else {
        deferred.resolve(message.result);
      }
    }
  }

  function request(method, params = {}) {
    const id = nextId;
    nextId += 1;
    const payload = { jsonrpc: "2.0", id, method, params };
    const timeout = setTimeout(() => {
      pending.delete(id);
      child.kill();
    }, 15000);

    return new Promise((resolve, reject) => {
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      child.stdin.write(encodeMessage(payload));
    });
  }

  function notify(method, params = {}) {
    child.stdin.write(encodeMessage({ jsonrpc: "2.0", method, params }));
  }

  function close() {
    child.kill();
  }

  return { request, notify, close };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const client = createMcpClient();
  try {
    const init = await client.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "govibe-mcp-smoke", version: "0.1.0" },
    });
    assert(init.serverInfo?.name === "govibe-mcp", "initialize did not return govibe-mcp server info.");
    client.notify("notifications/initialized");

    const toolsList = await client.request("tools/list");
    const toolNames = new Set((toolsList.tools ?? []).map((tool) => tool.name));
    for (const tool of requiredTools) {
      assert(toolNames.has(tool), `tools/list is missing ${tool}.`);
    }

    const roadmapLoad = await client.request("tools/call", {
      name: "govibe.roadmap.load",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        source: "docs/roadmap/ROADMAP-govibe-mcp-runtime.md",
        outputShape: "snapshot",
      },
    });
    const roadmap = roadmapLoad.structuredContent?.roadmap;
    assert(roadmap?.sourcePath === "docs/roadmap/ROADMAP-govibe-mcp-runtime.md", "roadmap.load did not return the expected source path.");
    assert(Array.isArray(roadmap.nodes) && roadmap.nodes.length > 0, "roadmap.load returned no roadmap nodes.");

    const roadmapUpdate = await client.request("tools/call", {
      name: "govibe.roadmap.update",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        nodeId: "TASK-002-mcp-bind",
        mutationType: "node.update",
        payload: {
          progress: 88,
          state: "in_progress",
          sourcePath: "docs/roadmap/ROADMAP-govibe-mcp-runtime.md",
          sourceSection: "MCP Tool Binding",
        },
      },
    });
    const updatedNode = roadmapUpdate.structuredContent?.roadmap?.nodes?.find((node) => node.id === "TASK-002-mcp-bind");
    assert(updatedNode?.progress === 88, "roadmap.update did not apply overlay progress.");

    const agentRun = await client.request("tools/call", {
      name: "govibe.agent.run",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        agent: "theseus",
        scope: "docs/features/integration-bridge",
        task: "Smoke-test prompt build only; do not execute an external agent.",
        mode: "doc",
        outputFormat: "text",
      },
    });
    assert(agentRun.structuredContent?.capability === "govibe.agent.run", "agent.run did not return structured launcher metadata.");
    assert(agentRun.structuredContent?.result?.ok === true, "agent.run launcher process failed.");
    assert(
      String(agentRun.structuredContent?.result?.stdout ?? "").includes("Smoke-test prompt build only"),
      "agent.run did not return launcher prompt output.",
    );

    console.log("PASS: GoVibe MCP smoke test");
    console.log(`tools: ${requiredTools.length}`);
    console.log(`roadmap nodes: ${roadmap.nodes.length}`);
    console.log(`agent launcher exit: ${agentRun.structuredContent.result.exitCode}`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
