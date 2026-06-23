import { useState, type ChangeEvent } from "react";
import type { AgentRecord } from "../../mission";

/**
 * Template-faithful Agent config back-face (A5). Live-data honest:
 * - controls are real, editable LOCAL state (a draft) — not persisted until a config backend feed exists.
 * - no fabricated telemetry (Genesis index count is shown honestly, not a fake "1.2M vectors").
 * Remount per agent via `key={agent.id}` from the parent resets the draft to registry defaults.
 */
function initialModelSource(agent: AgentRecord): "cloud" | "local" {
  return agent.defaultExecutor === "ollama" ? "local" : "cloud";
}

export function AgentConfigPanel({ agent, onClose }: { agent: AgentRecord; onClose: () => void }) {
  const [modelSource, setModelSource] = useState<"cloud" | "local">(initialModelSource(agent));
  const [systemPrompt, setSystemPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelEngine, setModelEngine] = useState(agent.model && agent.model !== "Registry-defined" ? agent.model : "Claude 4 Opus");
  const [localBackend, setLocalBackend] = useState("ollama");
  const [localUrl, setLocalUrl] = useState("");
  const [temp, setTemp] = useState(0.7);
  const [contextLimit, setContextLimit] = useState(128);
  const [planMode, setPlanMode] = useState(true);
  const [autoExecute, setAutoExecute] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const num = (event: ChangeEvent<HTMLInputElement>) => Number(event.target.value);

  return (
    <div className="config-face-inner">
      <div className="config-header">
        <span>Agent Settings</span>
        <button type="button" className="config-x" aria-label="Close settings" onClick={onClose}>✕</button>
      </div>

      <div className="config-grid">
        <div className="config-group">
          <label className="config-label" htmlFor="cfgPrompt">System Prompt</label>
          <textarea
            id="cfgPrompt"
            className="config-textarea"
            placeholder="You are an expert AI agent..."
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </div>

        <div className="config-group">
          <span className="config-label">Model Source</span>
          <div className="model-src-pill">
            <button type="button" className={modelSource === "cloud" ? "pill-active" : ""} onClick={() => setModelSource("cloud")}>Cloud API</button>
            <button type="button" className={modelSource === "local" ? "pill-active" : ""} onClick={() => setModelSource("local")}>Local Server</button>
          </div>
        </div>

        {modelSource === "cloud" ? (
          <div className="config-group config-subgroup">
            <div className="config-group">
              <label className="config-label" htmlFor="cfgApiKey">API Key</label>
              <div className="config-input-wrap">
                <input
                  id="cfgApiKey"
                  type={showApiKey ? "text" : "password"}
                  className="config-input"
                  placeholder="Enter API Key..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <button type="button" className="config-eye" aria-label="Toggle API key visibility" onClick={() => setShowApiKey((value) => !value)}>
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="config-group">
              <label className="config-label" htmlFor="cfgModel">Model Engine</label>
              <select id="cfgModel" className="config-select" value={modelEngine} onChange={(event) => setModelEngine(event.target.value)}>
                <option>Claude 4 Opus</option>
                <option>Gemini 3.1 Pro</option>
                <option>GPT-5</option>
                <option>Qwen 3 235B-A22B</option>
                <option>Llama 4 Maverick</option>
                <option>DeepSeek R2</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="config-group config-subgroup">
            <div className="config-group">
              <label className="config-label" htmlFor="cfgBackend">Backend</label>
              <select id="cfgBackend" className="config-select" value={localBackend} onChange={(event) => setLocalBackend(event.target.value)}>
                <option value="ollama">Ollama</option>
                <option value="lmstudio">LM Studio</option>
              </select>
            </div>
            <div className="config-group">
              <label className="config-label" htmlFor="cfgUrl">Endpoint URL</label>
              <input id="cfgUrl" type="text" className="config-input" placeholder="e.g. http://localhost:11434" value={localUrl} onChange={(event) => setLocalUrl(event.target.value)} />
            </div>
          </div>
        )}

        <div className="config-group">
          <div className="config-slider-group">
            <label className="config-label" htmlFor="cfgTemp">Creativity (Temp)</label>
            <span className="config-slider-val">{temp.toFixed(1)}</span>
          </div>
          <input id="cfgTemp" type="range" className="config-slider" min={0} max={1} step={0.1} value={temp} onChange={(event) => setTemp(num(event))} />
        </div>

        <div className="config-group">
          <div className="config-slider-group">
            <label className="config-label" htmlFor="cfgContext">Context Limit</label>
            <span className="config-slider-val">{contextLimit}k</span>
          </div>
          <input id="cfgContext" type="range" className="config-slider" min={8} max={256} step={8} value={contextLimit} onChange={(event) => setContextLimit(num(event))} />
        </div>

        <div className="config-group">
          <span className="config-label">Genesis Knowledge</span>
          <div className="genesis-panel">
            <div className="genesis-panel-header">
              <span className="genesis-panel-title">Genesis Knowledge</span>
              <span className="genesis-db-badge">GenesisDB</span>
            </div>
            <button type="button" className="genesis-add-btn" disabled title="Requires a connected GenesisDB knowledge feed">
              Add File to Knowledge
            </button>
            <div className="genesis-footer">
              <span>Indexed: <b>—</b></span>
              <span>Auto-Sync: <b>—</b></span>
            </div>
          </div>
        </div>

        <div className="config-group">
          <span className="config-label">Agent Behaviors</span>
          <div className="config-toggle-item">
            <div className="config-toggle-text">
              <strong>Plan Mode</strong>
              <small>Enable Docs-Driven planning before execution</small>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={planMode} onChange={(event) => setPlanMode(event.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="config-toggle-item">
            <div className="config-toggle-text">
              <strong>Auto-Execute Tasks</strong>
              <small>Run bounded tasks without confirmation</small>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={autoExecute} onChange={(event) => setAutoExecute(event.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      <div className="config-action-bar">
        {savedNote ? <span className="config-saved-note">Saved as local draft — connect a config backend to persist.</span> : null}
        <button type="button" className="btn-save-cfg" onClick={() => setSavedNote(true)}>Save Changes</button>
        <button type="button" className="btn-cancel-cfg" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
