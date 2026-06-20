import { missionDomains, type DomainId, type ThemeMode } from "../mission";

const domainOrder = Object.values(missionDomains);

function HeaderIcon({ kind }: { kind: string }) {
  if (kind === "compass") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6z" fill="currentColor" />
        <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
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
  if (kind === "blocks") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="7" height="7" rx="1.5" fill="currentColor" />
        <rect x="13" y="5" width="7" height="7" rx="1.5" fill="currentColor" opacity=".85" />
        <rect x="8.5" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity=".7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.25l6.75 3.9v7.7L12 19.75l-6.75-3.9v-7.7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4.25l3 1.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Header({
  activeDomain,
  connectionLabel,
  theme,
  onDomainChange,
  onToggleTheme,
  onRun,
}: {
  activeDomain: DomainId;
  connectionLabel: string;
  theme: ThemeMode;
  onDomainChange: (domain: DomainId) => void;
  onToggleTheme: () => void;
  onRun: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-shell">
        <div className="brand">
          <div className="brand-mark">GV</div>
          <div className="brand-copy">
            <strong>GoVibe Mission Control</strong>
            <span>Agent Command Center</span>
          </div>
        </div>
        <div className="reactor-status reactor-status-inline">
          <span className={connectionLabel === "CONNECTED" ? "online" : ""} />
          <strong>WS REACTOR</strong>
        </div>
      </div>
      <nav className="domain-tabs" aria-label="Mission domains">
        {domainOrder.map((domain) => (
          <button
            key={domain.id}
            className={activeDomain === domain.id ? "active" : ""}
            style={activeDomain === domain.id ? { borderColor: domain.color, color: domain.color } : undefined}
            onClick={() => onDomainChange(domain.id)}
          >
            <HeaderIcon kind={domain.icon} />
            <span>{domain.shortTitle}</span>
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <button className="primary-action" onClick={onRun}>
          Test Run
        </button>
        <span className="run-state">
          <i />
          Stable Run
        </span>
        <button className="icon-action" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? "Moon" : "Sun"}
        </button>
      </div>
    </header>
  );
}
