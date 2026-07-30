import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";

import { GovibeRuntime } from "./runtime-core.mjs";
import { toolCatalog } from "./registry.mjs";

const requiredTools = [
  "govibe.plan.create",
  "govibe.workflow.status",
  "govibe.workspace.impact",
  "govibe.docs.version",
  "govibe.review.run",
  "govibe.optimize.run",
  "govibe.agent.run",
  "govibe.docs.resolve",
  "govibe.roadmap.load",
  "govibe.roadmap.update",
  "govibe.roadmap.export",
  "govibe.deploy.vercel",
  "govibe.workspace.initialize",
  "govibe.workflow.continue",
  "govibe.workspace.scan",
];

const smokeExportPath = "docs/roadmap/ROADMAP-smoke-export.md";
const firstRecordedAt = "2026-06-13T01:00:00.000Z";
const secondRecordedAt = "2026-06-13T02:00:00.000Z";
const historicalQueryAt = "2026-06-13T01:30:00.000Z";

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
  const registryRuntime = new GovibeRuntime();
  const registrySnapshot = await registryRuntime.initialize();
  assert(registrySnapshot.agents.length > 0, "runtime did not load registered agents.");
  assert(
    registrySnapshot.agents.every((agent) => agent.status === "registered"),
    "registry-derived agents implied a live execution status.",
  );
  assert(
    registrySnapshot.agents.every((agent) => agent.fleet?.sourceRefs?.length > 0),
    "registry-derived agents are missing source references.",
  );
  assert(registrySnapshot.capabilities.length === toolCatalog.length, "runtime capability records do not match the MCP tool catalog.");
  assert(
    registrySnapshot.capabilities.every(
      (capability) => capability.status === "registered" && capability.sourcePath === "scripts/mcp/registry.mjs",
    ),
    "runtime capabilities imply execution state or lack registry provenance.",
  );

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
    assert(roadmap.approvalStatus === "approved", "roadmap.load returned a source that is not approved.");

    const automaticRoadmapLoad = await client.request("tools/call", {
      name: "govibe.roadmap.load",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        outputShape: "snapshot",
      },
    });
    const automaticRoadmap = automaticRoadmapLoad.structuredContent?.roadmap;
    const availableSources = automaticRoadmapLoad.structuredContent?.availableSources ?? [];
    const topApprovedSource = availableSources.find((source) => source.approvalStatus === "approved");
    assert(topApprovedSource, "roadmap.load did not expose ranked approved roadmap sources.");
    assert(availableSources.some((source) => source.sourceType === "masterplan"), "roadmap source inventory is missing masterplan discovery.");
    assert(
      automaticRoadmap?.sourcePath === topApprovedSource.sourcePath,
      "roadmap.load did not automatically select the highest-ranked approved roadmap source.",
    );
    assert(automaticRoadmap?.approvalStatus === "approved", "automatic roadmap selection returned an unapproved source.");
    assert(automaticRoadmap?.score === automaticRoadmapLoad.structuredContent?.activeSourceScore, "active roadmap score was not exposed consistently.");

    let draftSourceRejected = false;
    try {
      await client.request("tools/call", {
        name: "govibe.roadmap.load",
        arguments: {
          actor: "smoke-test",
          project: "govibe",
          source: "docs/roadmap/BACKLOG-p1-mvp-core.md",
          outputShape: "snapshot",
        },
      });
    } catch (error) {
      draftSourceRejected = String(error).includes("is not approved");
    }
    assert(draftSourceRejected, "roadmap.load did not reject an explicitly requested draft source.");

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
          validFrom: "2026-06-13T00:00:00.000Z",
          recordedAt: firstRecordedAt,
        },
      },
    });
    const updatedNode = roadmapUpdate.structuredContent?.roadmap?.nodes?.find((node) => node.id === "TASK-002-mcp-bind");
    assert(updatedNode?.progress === 88, "roadmap.update did not apply overlay progress.");
    assert(updatedNode?.recordedAt === firstRecordedAt, "roadmap.update did not preserve recordedAt.");

    const secondRoadmapUpdate = await client.request("tools/call", {
      name: "govibe.roadmap.update",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        nodeId: "TASK-002-mcp-bind",
        mutationType: "node.update",
        payload: {
          progress: 91,
          state: "qa_review",
          validFrom: "2026-06-13T00:00:00.000Z",
          recordedAt: secondRecordedAt,
        },
      },
    });
    const secondUpdatedNode = secondRoadmapUpdate.structuredContent?.roadmap?.nodes?.find((node) => node.id === "TASK-002-mcp-bind");
    assert(secondUpdatedNode?.progress === 91, "second roadmap.update did not expose the latest version.");

    const historicalLoad = await client.request("tools/call", {
      name: "govibe.roadmap.load",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        source: "docs/roadmap/ROADMAP-govibe-mcp-runtime.md",
        asOfValidAt: "2026-06-13T00:30:00.000Z",
        asOfRecordedAt: historicalQueryAt,
      },
    });
    const historicalNode = historicalLoad.structuredContent?.roadmap?.nodes?.find((node) => node.id === "TASK-002-mcp-bind");
    assert(historicalNode?.progress === 88, "asOfRecordedAt did not return the historical task version.");

    const futureUpdate = await client.request("tools/call", {
      name: "govibe.roadmap.update",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        nodeId: "TASK-003-gateway-bootstrap",
        mutationType: "node.update",
        payload: {
          progress: 7,
          state: "blocked",
          validFrom: "2099-01-01T00:00:00.000Z",
          recordedAt: "2026-06-13T03:00:00.000Z",
        },
      },
    });
    const futureCurrentNode = futureUpdate.structuredContent?.roadmap?.nodes?.find((node) => node.id === "TASK-003-gateway-bootstrap");
    assert(futureCurrentNode?.progress !== 7, "future validFrom affected the current roadmap view.");

    const roadmapExport = await client.request("tools/call", {
      name: "govibe.roadmap.export",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        outputPath: smokeExportPath,
        overwrite: true,
      },
    });
    assert(roadmapExport.structuredContent?.outputPath === smokeExportPath, "roadmap.export did not write the expected output path.");
    assert(roadmapExport.structuredContent?.taskCount >= 3, "roadmap.export did not include task-level rows.");

    const exportedLoad = await client.request("tools/call", {
      name: "govibe.roadmap.load",
      arguments: {
        actor: "smoke-test",
        project: "govibe",
        source: smokeExportPath,
        outputShape: "snapshot",
      },
    });
    const exportedRoadmap = exportedLoad.structuredContent?.roadmap;
    assert(exportedRoadmap?.sourcePath === smokeExportPath, "exported roadmap did not load back from the export path.");
    assert(
      exportedRoadmap?.nodes?.some((node) => node.id === "TASK-002-mcp-bind" && node.progress === 91),
      "exported roadmap did not preserve the updated task row.",
    );
    const exportedTemporalNode = exportedRoadmap?.nodes?.find((node) => node.id === "TASK-002-mcp-bind");
    assert(exportedTemporalNode?.recordedAt === secondRecordedAt, "export/load round trip did not preserve Recorded At.");
    assert(exportedTemporalNode?.version, "export/load round trip did not preserve Version.");

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

    const stepRun = await client.request("tools/call", {
      name: "govibe.orchestrate.step",
      arguments: {
        actor: "smoke-test",
        taskId: "SMOKE-STEP-TASK",
        agentId: "theseus",
        mode: "doc",
        scope: "docs/features/integration-bridge",
        task: "Smoke-test StEP prompt build only; do not execute an external agent.",
        definitionOfDone: { checks: [] },
        maxAttempts: 1,
      },
    });
    assert(stepRun.structuredContent?.capability === "govibe.orchestrate.step", "orchestrate.step did not return structured StEP metadata.");
    assert(stepRun.structuredContent?.result?.status === "done", "orchestrate.step did not reach done on a prompt-build run with an empty Definition-of-Done.");
    assert(stepRun.structuredContent?.result?.selfCheck?.verdict === "pass", "orchestrate.step self-check did not pass for an empty Definition-of-Done.");

    console.log("PASS: GoVibe MCP smoke test");
    console.log(`tools: ${requiredTools.length}`);
    console.log(`roadmap nodes: ${roadmap.nodes.length}`);
    console.log(`agent launcher exit: ${agentRun.structuredContent.result.exitCode}`);
  } finally {
    client.close();
    await unlink(smokeExportPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
