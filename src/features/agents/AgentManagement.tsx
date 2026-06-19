import { useState, type CSSProperties, type PointerEvent } from "react";
import type { MissionCommand, MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { AgentFleetMetadataPanel } from "./AgentFleetMetadataPanel";

export function AgentManagement({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const registryAgents = snapshot.agents.map((agent) => ({
    ...agent,
    package: agent.fleet?.domain ?? "Registry metadata",
    abilities: agent.fleet?.responsibility ?? [],
  }));
  const activeAgent = registryAgents[selectedAgentIndex];
  const activeMedia = activeAgent?.avatarUrl;
  const deckAgents = registryAgents.map((agent, index) => {
    const rawOffset = index - selectedAgentIndex;
    const half = registryAgents.length / 2;
    const offset = rawOffset > half ? rawOffset - registryAgents.length : rawOffset < -half ? rawOffset + registryAgents.length : rawOffset;
    return { agent, index, offset };
  });

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

  const selectRegistryAgent = (index: number) => {
    const nextIndex = (index + registryAgents.length) % registryAgents.length;
    setSelectedAgentIndex(nextIndex);
    setConfigOpen(false);
    void send({ type: "agent.select", agentId: registryAgents[nextIndex].id });
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
              <article><span>Tasks</span><strong>{activeAgent.tasks}</strong></article>
              <article><span>Accuracy</span><strong>{activeAgent.accuracy}</strong></article>
              <article><span>Speed</span><strong>{activeAgent.speed}</strong></article>
            </div>
            <div className="ability-tags large">
              {activeAgent.abilities.length > 0
                ? activeAgent.abilities.map((ability) => <span key={ability}>{ability}</span>)
                : <span>Responsibility metadata unavailable</span>}
            </div>
            <div className="carousel-section">
              <div className="carousel-title">
                <span>Roster</span>
                <div>
                  <button type="button" aria-label="Previous agent" onClick={() => selectRegistryAgent(selectedAgentIndex - 1)}>Up</button>
                  <button type="button" aria-label="Next agent" onClick={() => selectRegistryAgent(selectedAgentIndex + 1)}>Down</button>
                </div>
              </div>
              <div className="agent-carousel-viewport" aria-label="Agent carousel">
                {deckAgents.map(({ agent, index, offset }) => (
                  <button
                    key={agent.name}
                    type="button"
                    className={index === selectedAgentIndex ? "agent-deck-card active" : "agent-deck-card"}
                    data-offset={offset}
                    aria-current={index === selectedAgentIndex ? "true" : undefined}
                    onClick={() => selectRegistryAgent(index)}
                    style={{ "--agent-accent": agent.accent, "--deck-offset": offset } as CSSProperties}
                  >
                    <span className="deck-avatar">{agent.name.slice(0, 2)}</span>
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.role}</small>
                      <em>{agent.package}</em>
                    </span>
                    <i>{agent.status}</i>
                  </button>
                ))}
              </div>
            </div>
            <div className="bottom-bar">
              <span><kbd>Up</kbd><kbd>Down</kbd> Navigate</span>
              <button type="button" onClick={() => setConfigOpen((value) => !value)}>{configOpen ? "Close Metadata" : "Role Metadata"}</button>
              <button type="button" disabled title="Deployment requires an approved assignment event.">Deploy unavailable</button>
            </div>
          </section>
          <section className="character-sector">
            <div className={configOpen ? "character-console flipped" : "character-console"} onPointerMove={updateTilt} onPointerLeave={resetTilt}>
              <span className="corner one" />
              <span className="corner two" />
              <div className="console-lights"><i /><i /><i /></div>
              <div className="char-media">
                {activeMedia ? (
                  <img src={activeMedia} alt={`${activeAgent.name} portrait`} />
                ) : (
                  <div className="char-media-fallback">{activeAgent.name}</div>
                )}
              </div>
              <div className="char-identity">
                <strong>{activeAgent.name}</strong>
                <span>{activeAgent.role}</span>
                <em>{activeAgent.model}</em>
              </div>
              <div className="character-config-face">
                <header>
                  <span>Registry Metadata</span>
                  <button type="button" onClick={() => setConfigOpen(false)}>Close</button>
                </header>
                <AgentFleetMetadataPanel agent={snapshot.agents[selectedAgentIndex]} />
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
