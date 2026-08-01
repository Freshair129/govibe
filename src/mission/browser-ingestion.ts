import { isMissionEvent, isRecord, type MissionEvent } from "../../packages/mission-protocol/index.js";

const SOURCE_MARKER = "govibe-mission-control";

export function resolveMissionEventOrigins(configured: string | undefined, currentOrigin: string): ReadonlySet<string> {
  const candidates = configured?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [currentOrigin];
  return new Set(candidates.filter((origin) => origin !== "*"));
}

export function readTrustedMissionMessage(event: MessageEvent<unknown>, expectedSource: Window, allowedOrigins: ReadonlySet<string>): MissionEvent | undefined {
  if (!allowedOrigins.has(event.origin) || event.source !== expectedSource || !isRecord(event.data)) return undefined;
  if (event.data.source !== SOURCE_MARKER || !isMissionEvent(event.data.event)) return undefined;
  return event.data.event;
}

export function readDevelopmentCustomMissionEvent(value: unknown, enabled: boolean): MissionEvent | undefined {
  return enabled && isMissionEvent(value) ? value : undefined;
}
