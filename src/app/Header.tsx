import { missionDomains, type DomainId, type ThemeMode } from "../mission";

const domainOrder = Object.values(missionDomains);

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
      <div className="brand">
        <div className="brand-mark">GV</div>
        <div>
          <strong>GoVibe Mission Control</strong>
          <span>Agent Command Center</span>
        </div>
      </div>
      <nav className="domain-tabs">
        {domainOrder.map((domain) => (
          <button
            key={domain.id}
            className={activeDomain === domain.id ? "active" : ""}
            style={activeDomain === domain.id ? { borderColor: domain.color, color: domain.color } : undefined}
            onClick={() => onDomainChange(domain.id)}
          >
            {domain.shortTitle}
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <div className="reactor-status">
          <span className={connectionLabel === "CONNECTED" ? "online" : ""} />
          <strong>WS REACTOR</strong>
        </div>
        <button className="primary-action" onClick={onRun}>Test Run</button>
        <button className="icon-action" onClick={onToggleTheme} aria-label="Toggle theme">{theme === "dark" ? "Moon" : "Sun"}</button>
      </div>
    </header>
  );
}
