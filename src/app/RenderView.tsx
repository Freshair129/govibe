import type { MissionCommand, MissionSnapshot, ThemeMode, ViewId } from "../mission";
import { AgentManagement } from "../features/agents/AgentManagement";
import { AstTreeView } from "../features/ast/AstTreeView";
import { CampaignLogsView } from "../features/benchmark/CampaignLogsView";
import { Heatmap } from "../features/benchmark/Heatmap";
import { ReactorRunTrigger } from "../features/benchmark/ReactorRunTrigger";
import { CapabilityPlugins } from "../features/capabilities/CapabilityPlugins";
import { MissionCanvasView } from "../features/canvas/MissionCanvasView";
import { AgentConsoleView } from "../features/console/AgentConsoleView";
import { ContextOperationsView } from "../features/context/ContextOperationsView";
import { RealTimeDashboard } from "../features/dashboard/RealTimeDashboard";
import { DatabaseErdView } from "../features/erd/DatabaseErdView";
import { GraphStudioView } from "../features/graph/GraphStudioView";
import { GraphView } from "../features/graph/GraphView";
import { DataIngestView } from "../features/ingest/DataIngestView";
import { ReadinessControlView } from "../features/readiness/ReadinessControlView";
import { RoadmapBoard } from "../features/roadmap/RoadmapBoard";
import { BusinessSpecificationsView } from "../features/specs/BusinessSpecificationsView";
import { SymbolExplorerView } from "../features/symbols/SymbolExplorerView";
import { TokenMonitorView } from "../features/token-monitor/TokenMonitorView";
import { HnswVectorView } from "../features/vector/HnswVectorView";
import { IntelligenceZoo } from "../features/zoo/IntelligenceZoo";

export function RenderView({
  activeView,
  snapshot,
  theme,
  send,
  ingest,
  onNavigate,
}: {
  activeView: ViewId;
  snapshot: MissionSnapshot;
  theme: ThemeMode;
  send: (command: MissionCommand) => void;
  ingest: (json: string) => void;
  onNavigate: (view: ViewId) => void;
}) {
  if (activeView === "A1") return <RealTimeDashboard snapshot={snapshot} theme={theme} send={send} />;
  if (activeView === "A2") return <RoadmapBoard snapshot={snapshot} send={send} />;
  if (activeView === "A3") return <CapabilityPlugins snapshot={snapshot} />;
  if (activeView === "A4") return <ContextOperationsView snapshot={snapshot} />;
  if (activeView === "A5") return <AgentManagement snapshot={snapshot} send={send} />;
  if (activeView === "A6") return <ReadinessControlView snapshot={snapshot} send={send} />;
  if (activeView === "A7") return <TokenMonitorView snapshot={snapshot} />;
  if (activeView === "A8") return <MissionCanvasView snapshot={snapshot} send={send} onNavigate={onNavigate} />;
  if (activeView === "A9") return <AgentConsoleView snapshot={snapshot} send={send} />;
  if (activeView === "B1") return <AstTreeView snapshot={snapshot} />;
  if (activeView === "B2") return <BusinessSpecificationsView snapshot={snapshot} />;
  if (activeView === "B3") return <GraphStudioView snapshot={snapshot} />;
  if (activeView === "B4") return (
    <GraphView
      snapshot={snapshot}
      title="Observed Link Graph"
      desc="Edges are Deep Scan's undifferentiated union of doc links, imports, calls, and inheritance references -- the published contract drops relation type, so it cannot be shown or filtered here."
      showSummaryPanel
    />
  );
  if (activeView === "C1") return <SymbolExplorerView snapshot={snapshot} />;
  if (activeView === "C2") return <IntelligenceZoo snapshot={snapshot} />;
  if (activeView === "C3") return <DataIngestView ingest={ingest} />;
  if (activeView === "C4") return <DatabaseErdView snapshot={snapshot} />;
  if (activeView === "D1") return <ReactorRunTrigger send={send} />;
  if (activeView === "D2") return <Heatmap snapshot={snapshot} />;
  if (activeView === "D3") return <CampaignLogsView snapshot={snapshot} />;
  return <HnswVectorView snapshot={snapshot} />;
}
