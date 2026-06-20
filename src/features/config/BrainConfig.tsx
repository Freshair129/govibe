import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function BrainConfig() {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Runtime Config" title="Brain & Config" desc="Runtime controls only appear when the mission snapshot publishes them." />
      <EmptyState
        title="No runtime config connected"
        body="The mission snapshot does not yet publish live model, behavior, or limit controls. This view stays read-only until a governed config source exists."
      />
    </div>
  );
}
