import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { selectSchemaSymbols } from "./schema-symbols";

export function DatabaseErdView({ snapshot }: { snapshot: MissionSnapshot }) {
  const schemaSymbols = selectSchemaSymbols(snapshot.symbols);
  return (
    <div className="view-stack">
      <div className="view-title-row">
        {/* TASK-PRD-007 (F3): "Block DB" implied GenesisBlockDB canonical membership; schemaSymbols
            below are Deep Scan's observed orm-model candidates, not promoted/canonical records. */}
        <ViewHeader eyebrow="Schema" title="Database ERD Schema" desc="Relational schema visibility among Deep Scan's observed ORM-model candidates." />
        <button className="panel-action">Re-align Connections</button>
      </div>
      <section className="panel erd-canvas">
        {schemaSymbols.length === 0 ? (
          <EmptyState title="No schema records" body="Publish ORM/schema records before rendering the ERD. TypeScript symbols alone are not schema entities." />
        ) : (
          schemaSymbols.map((symbol) => (
            <article className="db-table-card" key={`${symbol.path}-${symbol.name}`}>
              <strong>{symbol.name}</strong>
              <span>{symbol.kind}</span>
              <small>{symbol.path}</small>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
