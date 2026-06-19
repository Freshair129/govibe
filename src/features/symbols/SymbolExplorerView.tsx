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

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Block DB" title="Symbol Explorer Hub" />
        <input
          className="table-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter symbols..."
        />
      </div>
      {snapshot.symbols.length === 0 ? <EmptyState title="No symbols indexed" body="Publish snapshot.symbols to populate this view." /> : (
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
                  <td><span>Indexed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
