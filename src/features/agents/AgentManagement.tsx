import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { MissionCommand, MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { AgentConfigPanel } from "./AgentConfigPanel";
import { AgentCard } from "./AgentCard";
import { deriveAgentStats } from "./agentStats";

export function AgentManagement({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const registryAgents = snapshot.agents;
  const activeAgent = registryAgents[selectedAgentIndex];
  const activeMedia = activeAgent?.avatarUrl;
  const activeStats = activeAgent ? deriveAgentStats(snapshot, activeAgent) : null;
  const deckAgents = registryAgents.map((agent, index) => {
    const rawOffset = index - selectedAgentIndex;
    const half = registryAgents.length / 2;
    const offset = rawOffset > half ? rawOffset - registryAgents.length : rawOffset < -half ? rawOffset + registryAgents.length : rawOffset;
    return { agent, index, offset, stats: deriveAgentStats(snapshot, agent) };
  });

  // Drag-to-scrub state: drag the deck vertically to browse; commit (send select) on tap/buttons.
  const dragRef = useRef<{ startY: number; shift: number } | null>(null);
  const wasDrag = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Mouse-wheel scrubs the carousel (matches the curve-carousel reference). Native non-passive
  // listener so we can preventDefault and stop the page from scrolling under the deck.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || registryAgents.length === 0) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const dir = event.deltaY > 0 ? 1 : -1;
      setSelectedAgentIndex((prev) => (prev + dir + registryAgents.length) % registryAgents.length);
      setConfigOpen(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [registryAgents.length]);

  const updateCursorGlow = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  };

  const updateTilt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${(-py * 9).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(px * 11).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  };

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };

  const wrapIndex = (index: number) => (index + registryAgents.length) % registryAgents.length;

  const commitSelect = (index: number) => {
    const nextIndex = wrapIndex(index);
    setSelectedAgentIndex(nextIndex);
    setConfigOpen(false);
    void send({ type: "agent.select", agentId: registryAgents[nextIndex].id });
  };

  const onDeckPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: event.clientY, shift: 0 };
    wasDrag.current = false;
  };

  const onDeckPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state) return;
    const delta = event.clientY - state.startY;
    if (Math.abs(delta) > 6) wasDrag.current = true;
    const step = Math.round(-delta / 96);
    const diff = step - state.shift;
    if (diff !== 0) {
      state.shift = step;
      setSelectedAgentIndex((prev) => wrapIndex(prev + diff));
    }
  };

  const endDeckDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Covibe Overview" title="Agent Management" desc="Manage, configure and monitor the AI agent fleet." />
        <span className="fleet-count">{snapshot.agents.length} Registered Agents</span>
      </div>
      {snapshot.agents.length > 0 && activeAgent ? (
        <div className="agent-select-screen" style={{ "--agent-accent": activeAgent.accent } as CSSProperties} onPointerMove={updateCursorGlow}>
          <section className="selection-sector agent-deck-panel">
            <div className="top-bar">
              <span>Agent Select</span>
              <strong>{selectedAgentIndex + 1} / {registryAgents.length}</strong>
            </div>
            <div className="stats-panel">
              <article><span>Tasks</span><strong>{activeStats?.taskCount ?? 0}</strong></article>
              <article>
                <span>Success Rate</span>
                <strong>{activeStats?.successRate != null ? `${Math.round(activeStats.successRate * 100)}%` : "—"}</strong>
              </article>
              <article>
                <span>Model</span>
                <strong>{activeAgent.defaultExecutor ?? "—"}</strong>
              </article>
            </div>
            <div className="ability-tags large">
              {(activeAgent.fleet?.responsibility ?? []).length > 0
                ? activeAgent.fleet?.responsibility?.map((ability) => <span key={ability}>{ability}</span>)
                : <span>Responsibility metadata unavailable</span>}
            </div>
            <div className="carousel-section">
              <div className="carousel-title">
                <span>Roster</span>
                <div>
                  <button type="button" aria-label="Previous agent" onClick={() => commitSelect(selectedAgentIndex - 1)}>Up</button>
                  <button type="button" aria-label="Next agent" onClick={() => commitSelect(selectedAgentIndex + 1)}>Down</button>
                </div>
              </div>
              <div
                ref={viewportRef}
                className="agent-carousel-viewport"
                aria-label="Agent carousel — scroll or drag to browse"
                onPointerDown={onDeckPointerDown}
                onPointerMove={onDeckPointerMove}
                onPointerUp={endDeckDrag}
                onPointerCancel={endDeckDrag}
              >
                {deckAgents.map(({ agent, index, offset, stats }) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    stats={stats}
                    offset={offset}
                    active={index === selectedAgentIndex}
                    onSelect={() => { if (!wasDrag.current) commitSelect(index); }}
                    onTilt={updateTilt}
                    onResetTilt={resetTilt}
                  />
                ))}
              </div>
            </div>
            <div className="bottom-bar">
              <span><kbd>Up</kbd><kbd>Down</kbd> Navigate · drag to scrub</span>
              <button type="button" onClick={() => setConfigOpen((value) => !value)}>{configOpen ? "Close" : "Configure"}</button>
              <button type="button" className="btn-select" disabled title="Deployment requires an approved assignment event.">Deploy unavailable</button>
            </div>
          </section>
          <section className="character-sector">
            <div className="character-perspective" onPointerMove={updateTilt} onPointerLeave={resetTilt}>
              <div className="character-tilt">
                <div className={configOpen ? "character-flipper flipped" : "character-flipper"}>
                  <div className="character-front">
                    <div className="scanlines" aria-hidden="true" />
                    <span className="corner-bracket tl" aria-hidden="true" />
                    <span className="corner-bracket br" aria-hidden="true" />
                    <div className="console-lights" aria-hidden="true"><i /><i /><i /></div>
                    <div className="char-portrait">
                      {activeMedia ? (
                        <img src={activeMedia} alt={`${activeAgent.name} portrait`} />
                      ) : (
                        <div className="char-media-fallback">{activeAgent.name.slice(0, 2).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="char-identity">
                      <div className="char-codename">{activeAgent.name}</div>
                      <div className="char-role">{activeAgent.role}</div>
                      <div className="char-class-badge">
                        {activeAgent.defaultExecutor
                          ? `${activeAgent.defaultExecutor}${activeAgent.modelTier ? ` · ${activeAgent.modelTier}` : ""}`
                          : activeAgent.model}
                      </div>
                    </div>
                  </div>
                  <div className="character-back">
                    <div className="scanlines" aria-hidden="true" />
                    <AgentConfigPanel key={activeAgent.id} agent={activeAgent} onClose={() => setConfigOpen(false)} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="No registered agents available"
          body="The mission runtime did not return agent registry metadata. Registry agents are not inferred from UI placeholders."
        />
      )}
    </div>
  );
}
