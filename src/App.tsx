import { useEffect, useMemo, useRef, useState, type CSSProperties, type UIEvent } from "react";
import { Header } from "./app/Header";
import { RenderView } from "./app/RenderView";
import { Sidebar } from "./app/Sidebar";
import { StatusBar } from "./app/StatusBar";
import { Terminal } from "./app/Terminal";
import { useMissionSnapshot } from "./hooks/useMissionSnapshot";
import {
  defaultViewByDomain,
  missionDomains,
  missionGateway,
  type DomainId,
  type ThemeMode,
  type ViewId,
} from "./mission";

const domainOrder = Object.values(missionDomains);
const moduleLookup = Object.fromEntries(
  domainOrder.flatMap((domain) => domain.subModules.map((subModule) => [subModule.id, subModule])),
) as Record<ViewId, (typeof domainOrder)[number]["subModules"][number]>;

export function App() {
  const { snapshot, send } = useMissionSnapshot();
  const [theme, setTheme] = useState<ThemeMode>(() => localStorage.getItem("govibe-theme") === "light" ? "light" : "dark");
  const [activeDomain, setActiveDomain] = useState<DomainId>("A");
  const [activeView, setActiveView] = useState<ViewId>("A1");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const domain = missionDomains[activeDomain];
  const activeModule = moduleLookup[activeView];
  const scrollResetRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("govibe-theme", theme);
  }, [theme]);

  useEffect(() => () => {
    if (scrollResetRef.current !== null) {
      window.clearTimeout(scrollResetRef.current);
    }
  }, []);

  const connectionLabel = useMemo(() => snapshot.connectionState.toUpperCase(), [snapshot.connectionState]);

  const changeDomain = (next: DomainId) => {
    setActiveDomain(next);
    setActiveView(defaultViewByDomain[next]);
  };

  const ingest = (json: string) => {
    const event = JSON.parse(json) as Parameters<typeof missionGateway.handleEvent>[0];
    missionGateway.handleEvent(event);
  };

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const max = Math.max(target.scrollHeight - target.clientHeight, 1);
    const next = Math.min(target.scrollTop / Math.min(max, 240), 1);
    setScrollProgress(next);

    if (scrollResetRef.current !== null) {
      window.clearTimeout(scrollResetRef.current);
    }

    scrollResetRef.current = window.setTimeout(() => {
      setScrollProgress(0);
      scrollResetRef.current = null;
    }, 180);
  };

  return (
    <div
      className="app-shell"
      style={
        {
          "--accent": domain.color,
          "--shell-scroll-progress": scrollProgress,
        } as CSSProperties
      }
    >
      <div className="ambient one" />
      <div className="ambient two" />
      <Header
        activeDomain={activeDomain}
        theme={theme}
        onDomainChange={changeDomain}
        onToggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")}
      />
      <div className="app-body">
        <Sidebar
          activeDomain={activeDomain}
          activeView={activeView}
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((value) => !value)}
          onViewChange={setActiveView}
        />
        <main onScroll={handleScroll}>
          <StatusBar connectionLabel={connectionLabel} updatedAt={snapshot.updatedAt} />
          <RenderView activeView={activeView} snapshot={snapshot} theme={theme} send={send} ingest={ingest} />
        </main>
      </div>
      <footer>
        <div>GoVibe Mission Control | Stable Build</div>
        <div>Live Context: <span>{domain.title} &gt; {activeView}: {activeModule.name}</span></div>
      </footer>
      <Terminal snapshot={snapshot} send={send} />
    </div>
  );
}
