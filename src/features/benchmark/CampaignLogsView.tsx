import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function CampaignLogsView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AI Benchmark" title="EABS-01 Campaign Logs" desc="Campaign stream renders only logs received through the mission snapshot." />
      <section className="panel campaign-log-panel">
        {snapshot.campaignLogs.length > 0 ? snapshot.campaignLogs.map((line, index) => (
          <pre key={`${index}-${line}`}>{line}</pre>
        )) : (
          <EmptyState title="No campaign logs connected" body="Start a governed campaign or publish campaign log events through the mission runtime." />
        )}
      </section>
    </div>
  );
}
