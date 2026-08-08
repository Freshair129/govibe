import { missionDomains, type DomainId, type ViewId } from "../mission";

function SidebarIcon({ kind }: { kind: string }) {
  if (kind === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4a8 8 0 1 0 8 8h-8z" fill="currentColor" />
        <path d="M13 4.08A8.01 8.01 0 0 1 19.92 11H13z" fill="currentColor" opacity=".55" />
      </svg>
    );
  }
  if (kind === "timeline") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="6" r="2" fill="currentColor" />
        <circle cx="18" cy="6" r="2" fill="currentColor" opacity=".75" />
        <circle cx="12" cy="18" r="2" fill="currentColor" opacity=".55" />
        <path d="M8 6h8M6 8v6m12 0V8m-4 10h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "compass") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".9" />
        <path
          d="M14.8 9.2 12.7 14l-4.7 2.1 2.1-4.8z"
          fill="currentColor"
          opacity=".9"
        />
        <path d="M12 8.4a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 0 1 0-7.2z" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".45" />
      </svg>
    );
  }
  if (kind === "plug") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 4v5m6-5v5M8 9h8v2a4 4 0 0 1-4 4v5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "brain") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4.5a3 3 0 0 0-3 3v.35A3.5 3.5 0 0 0 4.5 11c0 1.16.56 2.2 1.42 2.84A3.25 3.25 0 0 0 9 18.5h1.25V4.5zm5.75 0H13.5v14H15a3.25 3.25 0 0 0 3.08-4.66A3.5 3.5 0 0 0 19.5 11 3.5 3.5 0 0 0 18 7.85V7.5a3 3 0 0 0-3-3z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "gauge") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4a8 8 0 0 0-8 8h2a6 6 0 0 1 12 0h2a8 8 0 0 0-8-8z" fill="currentColor" opacity=".55" />
        <path d="M12 12l-3-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "token") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 9.5h6M9 14.5h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "robot") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="7" width="12" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="12" r="1.3" fill="currentColor" />
        <circle cx="14" cy="12" r="1.3" fill="currentColor" />
        <path
          d="M12 3.5v3M8.5 17v3M15.5 17v3M3.5 11.5h2M18.5 11.5h2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="currentColor" opacity=".18" />
      <path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SidebarDomainIcon({ kind }: { kind: string }) {
  return <SidebarIcon kind={kind} />;
}

function SidebarToggleIcon({ expanded }: { expanded: boolean }) {
  return <span aria-hidden="true">{expanded ? "<<" : ">>"}</span>;
}

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
      <div className="sidebar-main">
        <div className="sidebar-context">
          <div className="sidebar-context-icon" style={{ color: domain.color }}>
            <SidebarDomainIcon kind={domain.icon} />
          </div>
          <div className="sidebar-context-copy">
            <small>Active Domain</small>
            <strong>{domain.title}</strong>
          </div>
        </div>
        <div className="sidebar-divider" />
        <nav className="side-nav" aria-label={`${domain.title} views`}>
          {domain.subModules.map((sub) => (
            <button
              key={sub.id}
              aria-label={`${sub.id}: ${sub.name}`}
              data-tooltip={sub.name}
              className={activeView === sub.id ? "active" : ""}
              onClick={() => onViewChange(sub.id)}
            >
              <span className="side-nav-icon" aria-hidden="true">
                <SidebarIcon kind={sub.icon} />
              </span>
              <div className="side-nav-copy">
                <strong>
                  <span>{sub.id}:</span>
                  <span>{sub.name}</span>
                </strong>
              </div>
            </button>
          ))}
        </nav>
      </div>
      <button className="sidebar-toggle" onClick={onToggle}>
        <span className="sidebar-toggle-icon" aria-hidden="true">
          <SidebarToggleIcon expanded={expanded} />
        </span>
        <strong>{expanded ? "Collapse Sidebar" : "Expand Sidebar"}</strong>
      </button>
    </aside>
  );
}
