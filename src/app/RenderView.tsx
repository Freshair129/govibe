import type { MissionCommand, MissionSnapshot, ThemeMode, ViewId } from "../mission";
import { AgentManagement } from "../features/agents/AgentManagement";
import { AstTreeView } from "../features/ast/AstTreeView";
import { CampaignLogsView } from "../features/benchmark/CampaignLogsView";
import { Heatmap } from "../features/benchmark/Heatmap";
import { ReactorRunTrigger } from "../features/benchmark/ReactorRunTrigger";
import { CapabilityPlugins } from "../features/capabilities/CapabilityPlugins";
import { ContextOperationsView } from "../features/context/ContextOperationsView";
import { RealTimeDashboard } from "../features/dashboard/RealTimeDashboard";
import { DatabaseErdView } from "../features/erd/DatabaseErdView";
import { GraphStudioView } from "../features/graph/GraphStudioView";
import { GraphView } from "../features/graph/GraphView";
import { DataIngestView } from "../features/ingest/DataIngestView";
import { RoadmapBoard } from "../features/roadmap/RoadmapBoard";
import { BusinessSpecificationsView } from "../features/specs/BusinessSpecificationsView";
import { SymbolExplorerView } from "../features/symbols/SymbolExplorerView";
import { HnswVectorView } from "../features/vector/HnswVectorView";
import { IntelligenceZoo } from "../features/zoo/IntelligenceZoo";

export function RenderView({
  activeView,
  snapshot,
  theme,
  send,
  ingest,
}: {
  activeView: ViewId;
  snapshot: MissionSnapshot;
  theme: ThemeMode;
  send: (command: MissionCommand) => void;
  ingest: (json: string) => void;
}) {
  if (activeView === "A1") return <RealTimeDashboard snapshot={snapshot} theme={theme} send={send} />;
  if (activeView === "A2") return <RoadmapBoard snapshot={snapshot} send={send} />;
  if (activeView === "A3") return <CapabilityPlugins snapshot={snapshot} />;
  if (activeView === "A4") return <ContextOperationsView snapshot={snapshot} />;
  if (activeView === "A5") return <AgentManagement snapshot={snapshot} send={send} />;
  if (activeView === "B1") return <AstTreeView snapshot={snapshot} />;
  if (activeView === "B2") return <BusinessSpecificationsView snapshot={snapshot} />;
  if (activeView === "B3") return <GraphStudioView snapshot={snapshot} />;
  if (activeView === "B4") return <GraphView snapshot={snapshot} title="Live Call Graph" />;
  if (activeView === "C1") return <SymbolExplorerView snapshot={snapshot} />;
  if (activeView === "C2") return <IntelligenceZoo snapshot={snapshot} />;
  if (activeView === "C3") return <DataIngestView ingest={ingest} />;
  if (activeView === "C4") return <DatabaseErdView snapshot={snapshot} />;
  if (activeView === "D1") return <ReactorRunTrigger send={send} />;
  if (activeView === "D2") return <Heatmap snapshot={snapshot} />;
  if (activeView === "D3") return <CampaignLogsView snapshot={snapshot} />;
  return <HnswVectorView snapshot={snapshot} />;
}
