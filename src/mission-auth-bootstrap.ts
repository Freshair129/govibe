const configuredToken = import.meta.env.VITE_GOVIBE_MCP_TOKEN as string | undefined;
const configuredApiUrl = import.meta.env.VITE_GOVIBE_API_URL as string | undefined;
const configuredWsUrl = import.meta.env.VITE_GOVIBE_WS_URL as string | undefined;

function isSidecarHttpUrl(input: RequestInfo | URL) {
  try {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, window.location.href);
    if (configuredApiUrl && url.origin === new URL(configuredApiUrl, window.location.href).origin) return true;
    return (url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.port === "4310";
  } catch {
    return false;
  }
}

// TASK-PRD-028 (AUD-10b / AUD-32): the auth token previously rode in the WS URL's `?token=`
// query string, which lands in browser history, proxy/server access logs, and any Referer
// header on a later same-origin navigation. The native WebSocket API gives no way to attach a
// custom request header, so the token instead travels as the LAST offered Sec-WebSocket-Protocol
// subprotocol (RFC 6455) — base64url-encoded so it stays a valid HTTP token even though a raw
// bearer token can contain characters the subprotocol grammar forbids. The sidecar
// (scripts/mcp/sidecar-server.mjs) decodes the same way.
function encodeWebSocketProtocolToken(token: string): string {
  const base64 = btoa(token);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Review-gate hardening: `ws` (and RFC 6455 servers generally) echo back a client-offered
// subprotocol in the 101 response header, so offering ONLY the token-carrying subprotocol
// would round-trip the credential into that response header too (some reverse proxies log
// response headers). This fixed, non-secret sentinel is offered ALONGSIDE the token so the
// sidecar (scripts/mcp/sidecar-server.mjs's WS_ECHO_SUBPROTOCOL / handleProtocols) has a real,
// client-offered protocol to select and echo instead of the token.
const WS_ECHO_SUBPROTOCOL = "govibe-mission-control";

function createAuthenticatedWebSocket(
  NativeWebSocket: typeof WebSocket,
  authToken: string,
  wsUrl?: string,
) {
  return class AuthenticatedWebSocket extends NativeWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const target = new URL(url.toString(), window.location.href);
      const configuredWsOrigin = wsUrl ? new URL(wsUrl, window.location.href).origin : undefined;
      const isSidecar = configuredWsOrigin
        ? target.origin === configuredWsOrigin
        : (target.hostname === "127.0.0.1" || target.hostname === "localhost") && target.port === "4310";
      if (!isSidecar) {
        super(target.toString(), protocols);
        return;
      }
      const offered = protocols === undefined ? [] : Array.isArray(protocols) ? protocols : [protocols];
      // The token stays LAST (readWebSocketProtocolToken reads the last offered protocol);
      // the sentinel sits before it so the server has a non-secret value it can validly echo.
      super(target.toString(), [...offered, WS_ECHO_SUBPROTOCOL, encodeWebSocketProtocolToken(authToken)]);
    }
  };
}

export function installMissionAuthBootstrap() {
  const token = configuredToken;
  if (!token) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!isSidecarHttpUrl(input)) return nativeFetch(input, init);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
  }) as typeof window.fetch;

  window.WebSocket = createAuthenticatedWebSocket(
    window.WebSocket,
    token,
    configuredWsUrl,
  ) as typeof WebSocket;
}
