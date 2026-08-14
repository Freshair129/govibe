-- Issue #136: multi-tenant principal-scoped vault binding.
-- Additive/nullable by design: existing single-user/single-tenant rows retain
-- their legacy semantics when tenant/principal dimensions are absent.
ALTER TABLE vaults ADD COLUMN tenant_id TEXT;
ALTER TABLE vaults ADD COLUMN business_id TEXT;
ALTER TABLE vaults ADD COLUMN principal_id TEXT;
ALTER TABLE vaults ADD COLUMN visibility TEXT CHECK (
  visibility IS NULL OR visibility IN ('principal_private', 'tenant_private', 'business_shared', 'project_shared')
);
ALTER TABLE vaults ADD COLUMN policy_version TEXT;

CREATE INDEX idx_vaults_tenant_id ON vaults (tenant_id);
CREATE INDEX idx_vaults_business_id ON vaults (business_id);
CREATE INDEX idx_vaults_principal_id ON vaults (principal_id);
CREATE INDEX idx_vaults_workspace_principal_scope
  ON vaults (workspace_id, agent_id, tenant_id, principal_id)
  WHERE vault_type = 'workspace_private';
CREATE INDEX idx_vaults_global_principal_scope
  ON vaults (agent_id, tenant_id, principal_id)
  WHERE vault_type = 'global_private';
