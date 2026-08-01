import { describe, expect, it } from "vitest";
import {
  readDevelopmentCustomMissionEvent,
  readTrustedMissionMessage,
  resolveMissionEventOrigins,
} from "./missionBrowserIngress";

const validEvent = { type: "metrics.update", metrics: [] };

function messageEvent(overrides: Partial<MessageEventInit<unknown>> = {}) {
  return new MessageEvent("message", {
    origin: window.location.origin,
    source: window,
    data: { source: "govibe-mission-control", event: validEvent },
    ...overrides,
  });
}

describe("browser mission-event trust boundary", () => {
  const allowedOrigins = new Set([window.location.origin]);

  it("accepts a valid payload only from the allowed origin and expected window", () => {
    expect(readTrustedMissionMessage(messageEvent(), window, allowedOrigins)).toEqual(validEvent);
  });

  it("rejects a valid-looking payload from another origin", () => {
    expect(readTrustedMissionMessage(messageEvent({ origin: "https://attacker.example" }), window, allowedOrigins)).toBeUndefined();
  });

  it("rejects a valid-looking payload from an unexpected source window", () => {
    const foreignWindow = document.createElement("iframe").contentWindow;
    expect(readTrustedMissionMessage(messageEvent({ source: foreignWindow }), window, allowedOrigins)).toBeUndefined();
  });

  it("rejects malformed payloads without returning sensitive data", () => {
    const malformed = messageEvent({ data: { source: "govibe-mission-control", event: { type: "metrics.update", metrics: {}, secret: "do-not-log" } } });
    expect(readTrustedMissionMessage(malformed, window, allowedOrigins)).toBeUndefined();
  });

  it("keeps custom events disabled unless the development flag is explicit", () => {
    expect(readDevelopmentCustomMissionEvent(validEvent, false)).toBeUndefined();
    expect(readDevelopmentCustomMissionEvent(validEvent, true)).toEqual(validEvent);
  });

  it("drops wildcard origins from configuration", () => {
    expect([...resolveMissionEventOrigins("*,https://trusted.example", window.location.origin)]).toEqual(["https://trusted.example"]);
  });
});
