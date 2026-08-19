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

  it("carries the token as a WebSocket subprotocol for sidecar URLs only, never in the URL", async () => {
    const opened: { url: string; protocols?: string | string[] }[] = [];
    class FakeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        opened.push({ url: url.toString(), protocols });
      }
    }
    window.fetch = vi.fn<typeof fetch>(async () => new Response("{}", { status: 200 }));
    window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

    await installWithToken();
    new window.WebSocket("ws://localhost:4310/mission/ws");
    new window.WebSocket("wss://example.com/socket");

    // Sidecar connection: the URL never carries the token (no query string at all), and the
    // token rides as the last offered subprotocol, base64url-encoded, with a fixed non-secret
    // sentinel offered alongside it (review-gate hardening: gives the server something real to
    // echo back in the 101 response instead of reflecting the token).
    expect(new URL(opened[0].url).search).toBe("");
    const sidecarProtocols = Array.isArray(opened[0].protocols) ? opened[0].protocols : [opened[0].protocols];
    expect(sidecarProtocols).toContain("govibe-mission-control");
    const encodedToken = sidecarProtocols[sidecarProtocols.length - 1];
    expect(encodedToken).toBeTruthy();
    expect(encodedToken).not.toBe("govibe-mission-control");
    expect(atob((encodedToken as string).replace(/-/g, "+").replace(/_/g, "/"))).toBe("browser-test-token");

    // Non-sidecar connection: untouched — no protocols injected, no token anywhere.
    expect(opened[1].protocols).toBeUndefined();
    expect(new URL(opened[1].url).search).toBe("");
  });
});
