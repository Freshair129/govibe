export * from "./mission/domain";
export * from "./mission/navigation";
export {
  ReliableMissionGateway as MissionGateway,
  ingestReliableExternalMissionEvent as ingestExternalMissionEvent,
  missionGateway,
} from "./mission/gateway";

import { missionGateway } from "./mission/gateway";

export function saveFile(hash: string, data: ArrayBuffer, meta: Record<string, unknown>) {
  return missionGateway.send({ type: "file.save", hash, data, meta });
}
