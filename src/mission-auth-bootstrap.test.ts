import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = window.fetch;
const originalWebSocket = window.WebSocket;

afterEach(() => {
  window.fetch = originalFetch;
  window.WebSocket = originalWebSocket;
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

async function installWithToken(token = "browser-test-token") {
  vi.stubEnv("VITE_GOVIBE_MCP_TOKEN", token);
  vi.stubEnv("VITE_GOVIBE_API_URL", "http://localhost:4310");
  vi.stubEnv("VITE_GOVIBE_WS_URL", "ws://localhost:4310/mission/ws");
  const module = await import("./mission-auth-bootstrap");
  module.installMissionAuthBootstrap();
}

describe("Mission sidecar authentication bootstrap", () => {
  it("adds bearer authentication only to configured sidecar HTTP requests", async () => {
    const nativeFetch = vi.fn<typeof fetch>(async () => new Response("{}", { status: 200 }));
    window.fetch = nativeFetch;

    await installWithToken();
    await window.fetch("http://localhost:4310/mission/snapshot");
    await window.fetch("https://example.com/public");

    expect(new Headers(nativeFetch.mock.calls[0]?.[1]?.headers).get("Authorization")).toBe("Bearer browser-test-token");
    expect(new Headers(nativeFetch.mock.calls[1]?.[1]?.headers).get("Authorization")).toBeNull();
  });

  it("adds the token to configured sidecar WebSocket URLs only", async () => {
    const opened: string[] = [];
    class FakeWebSocket {
      constructor(url: string | URL) {
        opened.push(url.toString());
      }
    }
    window.fetch = vi.fn<typeof fetch>(async () => new Response("{}", { status: 200 }));
    window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

    await installWithToken();
    new window.WebSocket("ws://localhost:4310/mission/ws");
    new window.WebSocket("wss://example.com/socket");

    expect(new URL(opened[0]).searchParams.get("token")).toBe("browser-test-token");
    expect(new URL(opened[1]).searchParams.has("token")).toBe(false);
  });
});
