import { missionDomains, type DomainId, type ViewId } from "../mission";

export function Sidebar({
  activeDomain,
  activeView,
  expanded,
  onToggle,
  onViewChange,
}: {
  activeDomain: DomainId;
  activeView: ViewId;
  expanded: boolean;
  onToggle: () => void;
  onViewChange: (view: ViewId) => void;
}) {
  const domain = missionDomains[activeDomain];
  return (
    <aside className={expanded ? "sidebar expanded" : "sidebar"}>
      <div className="sidebar-context">
        <span style={{ color: domain.color }}>{activeDomain}</span>
        <div>
          <small>Active Domain</small>
          <strong>{domain.title}</strong>
        </div>
      </div>
      <div className="side-nav">
        {domain.subModules.map((sub) => (
          <button
            key={sub.id}
            aria-label={`${sub.id}: ${sub.name}`}
            data-tooltip={sub.name}
            className={activeView === sub.id ? "active" : ""}
            onClick={() => onViewChange(sub.id)}
          >
            <span>{sub.id}</span>
            <strong>{sub.name}</strong>
          </button>
        ))}
      </div>
      <button className="sidebar-toggle" onClick={onToggle}>{expanded ? "Collapse Sidebar" : "Expand Sidebar"}</button>
    </aside>
  );
}
