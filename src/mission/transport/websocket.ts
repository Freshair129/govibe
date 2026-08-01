export function deriveMissionWebSocketUrl(httpBaseUrl: string | undefined): string | undefined {
  if (!httpBaseUrl) return undefined;
  const url = new URL(httpBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/mission/ws";
  url.search = "";
  return url.toString();
}

export function createMissionWebSocket(url: string, factory?: (url: string) => WebSocket): WebSocket {
  return factory?.(url) ?? new WebSocket(url);
}
