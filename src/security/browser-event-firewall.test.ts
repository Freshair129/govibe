import { afterEach, describe, expect, it, vi } from "vitest";
import { installMissionEventFirewall, isMissionEventPayload } from "./browser-event-firewall";

const restores: Array<() => void> = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
});

describe("isMissionEventPayload", () => {
  it("accepts a supported event shape", () => {
    expect(isMissionEventPayload({ type: "metrics.update", metrics: [] })).toBe(true);
  });

  it("rejects unknown and malformed events", () => {
    expect(isMissionEventPayload({ type: "admin.override", snapshot: {} })).toBe(false);
    expect(isMissionEventPayload({ type: "metrics.update", metrics: {} })).toBe(false);
    expect(isMissionEventPayload(null)).toBe(false);
  });
});

describe("installMissionEventFirewall", () => {
  it("allows same-origin messages from the expected window", () => {
    const listener = vi.fn();
    restores.push(installMissionEventFirewall(window));
    window.addEventListener("message", listener);

    window.dispatchEvent(new MessageEvent("message", {
      origin: window.location.origin,
      source: window,
      data: {
        source: "govibe-mission-control",
        event: { type: "snapshot", snapshot: {} },
      },
    }));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects a valid-looking message from another origin", () => {
    const listener = vi.fn();
    restores.push(installMissionEventFirewall(window));
    window.addEventListener("message", listener);

    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://attacker.example",
      source: window,
      data: {
        source: "govibe-mission-control",
        event: { type: "snapshot", snapshot: {} },
      },
    }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects messages from an unexpected source window", () => {
    const listener = vi.fn();
    const foreignWindow = document.createElement("iframe").contentWindow;
    restores.push(installMissionEventFirewall(window));
    window.addEventListener("message", listener);

    window.dispatchEvent(new MessageEvent("message", {
      origin: window.location.origin,
      source: foreignWindow,
      data: {
        source: "govibe-mission-control",
        event: { type: "snapshot", snapshot: {} },
      },
    }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("rejects malformed custom mission events", () => {
    const listener = vi.fn();
    restores.push(installMissionEventFirewall(window));
    window.addEventListener("govibe:mission-event", listener);

    window.dispatchEvent(new CustomEvent("govibe:mission-event", {
      detail: { type: "snapshot" },
    }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("allows validated custom mission events", () => {
    const listener = vi.fn();
    restores.push(installMissionEventFirewall(window));
    window.addEventListener("govibe:mission-event", listener);

    window.dispatchEvent(new CustomEvent("govibe:mission-event", {
      detail: { type: "snapshot", snapshot: {} },
    }));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
