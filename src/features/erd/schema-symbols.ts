import type { MissionSnapshot } from "../../mission";

// TASK-PRD-007 defect 1: snapshot.symbols now carries every observed candidate that satisfies
// the {name,path,kind} contract -- Stage 5 TypeScript functions/classes/interfaces AND Stage 8
// ORM model discoveries (see scripts/mcp/runtime/workspace-service.mjs mapObservedGraph()). Only
// the latter genuinely represents a database schema entity. Rendering the former as a
// "db-table-card" is fabrication-by-presentation (PRODUCT.md live-data-only rule) -- functions
// and classes are not database tables. This is the single source of truth for which symbol
// `kind` values the ERD is allowed to treat as schema entities; the mapping side
// (workspace-service.mjs ORM_MODEL_SYMBOL_KIND) and this filter must stay in sync.
export const SCHEMA_SYMBOL_KINDS: ReadonlySet<string> = new Set(["orm-model"]);

export function selectSchemaSymbols(symbols: MissionSnapshot["symbols"]): MissionSnapshot["symbols"] {
  return symbols.filter((symbol) => SCHEMA_SYMBOL_KINDS.has(symbol.kind));
}
