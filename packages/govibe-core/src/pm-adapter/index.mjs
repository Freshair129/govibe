// GLS-005 public surface: the PmAdapter contract plus a factory that
// registers every implemented platform. Callers (the MCP tool service,
// tests) should go through createDefaultPmAdapterRegistry() rather than
// importing NotionAdapter/JiraAdapter directly, so adding a platform never
// requires touching a caller.
export {
  PROJECTION_STATES,
  isProjectionState,
  PmConnectorUnconfiguredError,
  PmAdapterRegistry,
  observedCandidateFromExternalChange,
} from "./pm-adapter-contract.mjs";
export { NotionAdapter } from "./notion-adapter.mjs";
export { JiraAdapter } from "./jira-adapter.mjs";

import { PmAdapterRegistry } from "./pm-adapter-contract.mjs";
import { NotionAdapter } from "./notion-adapter.mjs";
import { JiraAdapter } from "./jira-adapter.mjs";

export function createDefaultPmAdapterRegistry({ fetchImpl } = {}) {
  const registry = new PmAdapterRegistry();
  registry.register("notion", new NotionAdapter(fetchImpl ? { fetchImpl } : undefined));
  registry.register("jira", new JiraAdapter(fetchImpl ? { fetchImpl } : undefined));
  return registry;
}
