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
    { id: "A7", name: "Token Monitor", icon: "token" },
    { id: "A8", name: "Mission Canvas", icon: "nodes" },
    { id: "A9", name: "Agent Console", icon: "terminal" },
  ] },
  B: { id: "B", title: "Genesis Knowledge", shortTitle: "Genesis Knowledge", color: "#6366f1", icon: "brain", subModules: [
    // TASK-PRD-007 (F4): B1 renders a genuine directory/file path hierarchy derived from
    // observed graph node ids (see node-hierarchy.ts), not a parsed abstract syntax tree --
    // labelled accordingly so it doesn't claim AST parsing that doesn't exist.
    { id: "B1", name: "Observed Structure Tree", icon: "tree" }, { id: "B2", name: "Business Specifications", icon: "doc" },
    // TASK-PRD-007 (F2): B4 previously read "Live Call Graph" though its edges are Deep Scan's
    // undifferentiated union of WIKILINK/REFERENCES/IMPORTS/CALLS/INHERITS with relation type
    // dropped at publish time -- not exclusively calls. Relabelled to what it actually shows.
    { id: "B3", name: "Interactive Graph", icon: "nodes" }, { id: "B4", name: "Observed Link Graph", icon: "trace" },
  ] },
  // TASK-PRD-007 (F3): "Block DB" implied GenesisBlockDB canonical membership for a domain whose
  // views (Symbol Explorer, Intelligence Zoo, SRS-G Debugger, ERD, Observed Candidate Map) are
  // all unpromoted Deep Scan candidates -- MSP has not authorized them and GKS has not assigned
  // identity (CLAUDE.md: "Deep Scan creates observed candidates. It does not create canonical
  // GKS truth."). Round 2 already removed this branding from SymbolExplorerView's own eyebrow;
  // this closes the remaining domain-level survivor.
  C: { id: "C", title: "Observed Catalog", shortTitle: "Observed Catalog", color: "#06b6d4", icon: "blocks", subModules: [
    { id: "C1", name: "Symbol Explorer Hub", icon: "search" }, { id: "C2", name: "Intelligence Zoo", icon: "flask" },
    { id: "C3", name: "SRS-G Debugger", icon: "terminal" }, { id: "C4", name: "Database ERD Schema", icon: "db" },
    // TASK-PRD-007 (D3): renamed alongside HnswVectorView.tsx -- no embeddings/HNSW/vector space
    // exist in this system; the view (and this nav label) must not claim otherwise.
    { id: "C5", name: "Observed Candidate Map", icon: "vector" },
  ] },
  D: { id: "D", title: "AI Benchmark", shortTitle: "AI Benchmark", color: "#f59e0b", icon: "gauge", subModules: [
    { id: "D1", name: "Reactor Run Trigger", icon: "bolt" }, { id: "D2", name: "Cyber Reactor Heatmap", icon: "fire" },
    { id: "D3", name: "EABS-01 Campaign Logs", icon: "log" },
  ] },
};

export const defaultViewByDomain: Record<DomainId, ViewId> = { A: "A1", B: "B1", C: "C1", D: "D1" };
