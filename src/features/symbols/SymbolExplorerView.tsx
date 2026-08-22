import { useState } from "react";
import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function SymbolExplorerView({ snapshot }: { snapshot: MissionSnapshot }) {
  const [filter, setFilter] = useState("");
  const symbols = snapshot.symbols.filter((symbol) => {
    const query = filter.toLowerCase();
    return symbol.name.toLowerCase().includes(query) || symbol.path.toLowerCase().includes(query) || symbol.kind.toLowerCase().includes(query);
  });

  // TASK-PRD-007 (D3): CLAUDE.md -- "Deep Scan creates observed candidates. It does not create
  // canonical GKS truth." This view previously branded itself "Block DB" (GenesisBlockDB) and
  // hardcoded every row's status as "Indexed", implying canonical, persisted knowledge-base
  // membership that promotion through MSP/GKS never happened here. Deep Scan only ever produces
  // observed candidates (packages/govibe-core/src/scan/) -- present them as that, honestly.
  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Deep Scan" title="Symbol Explorer Hub" />
        <input
          className="table-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter symbols..."
        />
      </div>
      {snapshot.symbols.length === 0 ? <EmptyState title="No symbols observed" body="Publish snapshot.symbols, or run a deep scan, to populate this view." /> : (
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Symbol Name</th>
                <th>Type</th>
                <th>Source File</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((symbol) => (
                <tr key={`${symbol.path}-${symbol.name}`}>
                  <td>{symbol.name}</td>
                  <td>{symbol.kind}</td>
                  <td>{symbol.path}</td>
                  <td><span>Observed candidate</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
