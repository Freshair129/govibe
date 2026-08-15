-- Issue #74: bounded persistent GKS vertical slice.
-- These tables belong to the opt-in GKS provider behind the MSP process.
-- GoVibe never opens or queries them directly.

CREATE TABLE gks_knowledge (
  knowledge_ref TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK(stage BETWEEN 1 AND 12),
  source_snapshot_hash TEXT NOT NULL,
  source_version TEXT NOT NULL,
  provenance_ref TEXT NOT NULL,
  atom_ref TEXT,
  canonical_hash TEXT NOT NULL,
  candidate_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_gks_knowledge_workspace_created
  ON gks_knowledge(workspace_id, created_at DESC);

CREATE TABLE gks_retrieval_evidence (
  retrieval_ref TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  context_id TEXT,
  policy_decision TEXT NOT NULL CHECK(policy_decision IN ('allow', 'deny')),
  radius INTEGER NOT NULL,
  budget INTEGER NOT NULL,
  returned_count INTEGER NOT NULL,
  query_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_gks_retrieval_evidence_workspace_created
  ON gks_retrieval_evidence(workspace_id, created_at DESC);
