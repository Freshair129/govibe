const MISSION_EVENT_TYPES = new Set([
  "snapshot",
  "terminal.line",
  "metrics.update",
  "chart.update",
  "agents.update",
  "graph.update",
  "heatmap.update",
  "roadmap.snapshot",
  "roadmap.node.update",
  "roadmap.assignment",
  "roadmap.handoff",
  "roadmap.verification",
  "workflow.run",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMissionEventPayload(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== "string" || !MISSION_EVENT_TYPES.has(value.type)) {
    return false;
  }

  switch (value.type) {
    case "snapshot": return isRecord(value.snapshot);
    case "terminal.line": return isRecord(value.line);
    case "metrics.update": return Array.isArray(value.metrics);
    case "chart.update": return isRecord(value.chart);
    case "agents.update": return Array.isArray(value.agents);
    case "graph.update": return isRecord(value.graph);
    case "heatmap.update": return isRecord(value.heatmap);
    case "roadmap.snapshot": return isRecord(value.roadmap);
    case "roadmap.node.update": return isRecord(value.node);
    case "roadmap.assignment": return isRecord(value.assignment);
    case "roadmap.handoff": return isRecord(value.handoff);
    case "roadmap.verification": return isRecord(value.verification);
    case "workflow.run": return isRecord(value.run);
    default: return false;
  }
}

export type BrowserEventFirewallOptions = {
  allowedOrigins?: readonly string[];
  expectedSource?: Window;
};

export function installMissionEventFirewall(
  target: Window,
  options: BrowserEventFirewallOptions = {},
): () => void {
  const allowedOrigins = new Set(options.allowedOrigins ?? [target.location.origin]);
  const expectedSource = options.expectedSource ?? target;
  const originalAddEventListener = target.addEventListener.bind(target);

  target.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, eventOptions?: boolean | AddEventListenerOptions) => {
    if (type === "message" && typeof listener === "function") {
      const guarded: EventListener = (rawEvent) => {
        const event = rawEvent as MessageEvent<unknown>;
        if (!allowedOrigins.has(event.origin) || event.source !== expectedSource || !isRecord(event.data)) return;
        if (event.data.source !== "govibe-mission-control" || !isMissionEventPayload(event.data.event)) return;
        listener.call(target, event);
      };
      originalAddEventListener(type, guarded, eventOptions);
      return;
    }

    if (type === "govibe:mission-event" && typeof listener === "function") {
      const guarded: EventListener = (rawEvent) => {
        const event = rawEvent as CustomEvent<unknown>;
        if (!isMissionEventPayload(event.detail)) return;
        listener.call(target, event);
      };
      originalAddEventListener(type, guarded, eventOptions);
      return;
    }

    originalAddEventListener(type, listener, eventOptions);
  }) as typeof target.addEventListener;

  return () => {
    target.addEventListener = originalAddEventListener as typeof target.addEventListener;
  };
}
