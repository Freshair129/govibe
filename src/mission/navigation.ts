import type { DomainId, ViewId } from "./domain";

export type MissionDomain = {
  id: DomainId;
  title: string;
  shortTitle: string;
  color: string;
  icon: string;
  subModules: Array<{ id: ViewId; name: string; icon: string }>;
};

export const missionDomains: Record<DomainId, MissionDomain> = {
  A: { id: "A", title: "Project Overview", shortTitle: "Project Overview", color: "#10b981", icon: "compass", subModules: [
    { id: "A1", name: "Real-time Dashboard", icon: "chart" }, { id: "A2", name: "Roadmap Board", icon: "timeline" },
    { id: "A3", name: "Capability Plugins", icon: "plug" }, { id: "A4", name: "Brain & Config", icon: "brain" },
    { id: "A5", name: "Agent Management", icon: "robot" },
    { id: "A6", name: "Readiness Control", icon: "gauge" },
  ] },
  B: { id: "B", title: "Genesis Knowledge", shortTitle: "Genesis Knowledge", color: "#6366f1", icon: "brain", subModules: [
    { id: "B1", name: "AST Hierarchy Tree", icon: "tree" }, { id: "B2", name: "Business Specifications", icon: "doc" },
    { id: "B3", name: "Interactive Graph", icon: "nodes" }, { id: "B4", name: "Live Call Graph", icon: "trace" },
  ] },
  C: { id: "C", title: "Block DB", shortTitle: "Block DB", color: "#06b6d4", icon: "blocks", subModules: [
    { id: "C1", name: "Symbol Explorer Hub", icon: "search" }, { id: "C2", name: "Intelligence Zoo", icon: "flask" },
    { id: "C3", name: "SRS-G Debugger", icon: "terminal" }, { id: "C4", name: "Database ERD Schema", icon: "db" },
    { id: "C5", name: "HNSW Vector Space Map", icon: "vector" },
  ] },
  D: { id: "D", title: "AI Benchmark", shortTitle: "AI Benchmark", color: "#f59e0b", icon: "gauge", subModules: [
    { id: "D1", name: "Reactor Run Trigger", icon: "bolt" }, { id: "D2", name: "Cyber Reactor Heatmap", icon: "fire" },
    { id: "D3", name: "EABS-01 Campaign Logs", icon: "log" },
  ] },
};

export const defaultViewByDomain: Record<DomainId, ViewId> = { A: "A1", B: "B1", C: "C1", D: "D1" };
