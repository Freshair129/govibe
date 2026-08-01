import { useEffect, useState } from "react";
import type { MissionCommand, MissionSnapshot } from "../mission";
import { missionGateway } from "../missionGateway";

export function useMissionSnapshot() {
  const [snapshot, setSnapshot] = useState<MissionSnapshot>(() => missionGateway.getSnapshot());

  useEffect(() => {
    const unsubscribe = missionGateway.subscribe(setSnapshot);
    void missionGateway.connect();
    return unsubscribe;
  }, []);

  return {
    snapshot,
    send: (command: MissionCommand) => missionGateway.send(command),
  };
}
