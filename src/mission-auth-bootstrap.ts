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

  const NativeWebSocket = window.WebSocket;
  const AuthenticatedWebSocket = class extends NativeWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const target = new URL(url.toString(), window.location.href);
      const configuredWsOrigin = configuredWsUrl ? new URL(configuredWsUrl, window.location.href).origin : undefined;
      const isSidecar = configuredWsOrigin
        ? target.origin === configuredWsOrigin
        : (target.hostname === "127.0.0.1" || target.hostname === "localhost") && target.port === "4310";
      if (isSidecar) target.searchParams.set("token", token);
      super(target.toString(), protocols);
    }
  };
  window.WebSocket = AuthenticatedWebSocket as typeof WebSocket;
}
