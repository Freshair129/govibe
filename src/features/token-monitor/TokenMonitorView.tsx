import { useMemo } from "react";
import type { MissionSnapshot, UsageModelBreakdown, UsageSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatTokens(raw: number): string {
  if (raw >= 1_000_000) return `${(raw / 1_000_000).toFixed(1)}M`;
  if (raw >= 1_000) return `${(raw / 1_000).toFixed(1)}K`;
  return String(raw);
}

type ModelEntry = { name: string } & UsageModelBreakdown;

function sortedModels(models: Record<string, UsageModelBreakdown> | undefined): ModelEntry[] {
  if (!models) return [];
  return Object.entries(models)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.percent - a.percent);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverviewCards({ usage }: { usage: UsageSnapshot }) {
  const { overview } = usage;
  const s = (key: string, fallback = "0") => String(overview[key] ?? fallback);
  const cards = [
    { label: "Total Tokens", value: s("total_tokens") },
    { label: "Sessions", value: s("sessions") },
    { label: "Active Days", value: s("active_days") },
    { label: "Current Streak", value: `${s("current_streak")}d` },
    { label: "Favorite Model", value: s("favorite_model", "—") },
    { label: "Most Active Day", value: s("most_active_day", "—") },
  ];

  return (
    <div className="metric-grid">
      {cards.map((card) => (
        <article className="panel metric" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </div>
  );
}

function ModelBar({ model, maxPercent }: { model: ModelEntry; maxPercent: number }) {
  const barWidth = maxPercent > 0 ? (model.percent / maxPercent) * 100 : 0;

  return (
    <div className="tm-model-row">
      <div className="tm-model-header">
        <strong>{model.name}</strong>
        <span className="tm-model-pct">{model.percent.toFixed(1)}%</span>
      </div>
      <div className="tm-bar-track">
        <div className="tm-bar-fill" style={{ width: `${barWidth}%` }} />
      </div>
      <div className="tm-token-detail">
        <span>In: {formatTokens(model.input_tokens)}</span>
        <span>Out: {formatTokens(model.output_tokens)}</span>
      </div>
    </div>
  );
}

function ModelBreakdown({ models, title }: { models: Record<string, UsageModelBreakdown> | undefined; title: string }) {
  const sorted = useMemo(() => sortedModels(models), [models]);
  const maxPercent = sorted.length > 0 ? sorted[0].percent : 1;

  if (sorted.length === 0) {
    return (
      <section className="panel">
        <h2>{title}</h2>
        <EmptyState title="No model data" body="Model breakdown will appear after the first usage sync." />
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="tm-model-list">
        {sorted.map((model) => (
          <ModelBar key={model.name} model={model} maxPercent={maxPercent} />
        ))}
      </div>
    </section>
  );
}

function WeeklySummary({ usage }: { usage: UsageSnapshot }) {
  const w = usage.overview_7d;
  if (!w || (!w.total_tokens && !w.sessions)) return null;

  return (
    <section className="panel">
      <h2>Last 7 Days</h2>
      <div className="tm-week-grid">
        <div className="tm-week-stat"><span>Tokens</span><strong>{String(w.total_tokens ?? "0")}</strong></div>
        <div className="tm-week-stat"><span>Sessions</span><strong>{String(w.sessions ?? "0")}</strong></div>
        <div className="tm-week-stat"><span>Active Days</span><strong>{String(w.active_days ?? "0")}</strong></div>
      </div>
    </section>
  );
}

function DailyActivity({ usage }: { usage: UsageSnapshot }) {
  const daily = usage.code_usage?.daily;
  if (!daily || daily.length === 0) return null;

  const last14 = daily.slice(-14);
  const maxTokens = Math.max(...last14.map((d) => d.input_tokens + d.output_tokens), 1);

  return (
    <section className="panel">
      <h2>Daily Activity <small>({last14.length}d)</small></h2>
      <div className="tm-daily-chart">
        {last14.map((day) => {
          const total = day.input_tokens + day.output_tokens;
          const height = (total / maxTokens) * 100;
          const label = day.date.slice(5); // MM-DD
          return (
            <div className="tm-daily-bar-col" key={day.date} title={`${label}: ${formatTokens(total)} tokens, ${day.sessions} sessions`}>
              <div className="tm-daily-bar" style={{ height: `${Math.max(height, 2)}%` }} />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProjectUsage({ usage }: { usage: UsageSnapshot }) {
  const projects = usage.code_usage?.by_project;
  if (!projects || projects.length === 0) return null;

  const sorted = [...projects].sort((a, b) => b.total_tokens - a.total_tokens).slice(0, 10);

  return (
    <section className="panel">
      <h2>Top Projects</h2>
      {sorted.map((p) => (
        <div className="kv-row" key={p.project}>
          <span>{p.project}</span>
          <strong>{formatTokens(p.total_tokens)}</strong>
        </div>
      ))}
    </section>
  );
}

function SyncStatus({ usage }: { usage: UsageSnapshot }) {
  return (
    <div className="tm-sync-bar">
      <span>Source: <strong>{usage.source}</strong></span>
      {usage.account_id && <span>Account: <strong>{usage.account_id}</strong></span>}
      <span>Last sync: <strong>{relativeTime(usage.last_sync)}</strong></span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function TokenMonitorView({ snapshot }: { snapshot: MissionSnapshot }) {
  const usage = snapshot.usage;

  if (!usage || usage.source === "none") {
    return (
      <div className="view-stack">
        <ViewHeader eyebrow="Entitlement" title="Token Monitor" desc="Claude Code token usage tracking — synced from the token-monitor pipeline." />
        <EmptyState
          title="No usage data received"
          body="Run push_to_govibe.py or wait for the next sync cycle. The sidecar must be running on port 4310."
        />
      </div>
    );
  }

  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Entitlement" title="Token Monitor" desc="Claude Code token usage tracking — synced from the token-monitor pipeline." />
      <SyncStatus usage={usage} />
      <OverviewCards usage={usage} />
      <div className="dashboard-grid">
        <ModelBreakdown models={usage.models} title="Model Breakdown" />
        <WeeklySummary usage={usage} />
      </div>
      <DailyActivity usage={usage} />
      <div className="dashboard-grid">
        <ProjectUsage usage={usage} />
        <ModelBreakdown models={usage.models_7d} title="Models (7-day)" />
      </div>
    </div>
  );
}
