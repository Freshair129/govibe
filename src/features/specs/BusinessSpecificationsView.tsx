import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { viewTitle } from "../../mission/navigation";

export function BusinessSpecificationsView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Genesis Knowledge" title={viewTitle("B2")} desc="Business protocol specification for Genesis Knowledge." />
      {snapshot.specs.length ? (
        <section className="record-grid">
          {snapshot.specs.map((spec) => <article className="panel" key={spec.title}><h2>{spec.title}</h2><p>{spec.body}</p></article>)}
        </section>
      ) : (
        <EmptyState title="No functional specs connected" body="Publish snapshot.specs before rendering business protocol records." />
      )}
    </div>
  );
}
