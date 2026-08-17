// NotionAdapter: outbound projection of a canonical GoVibe task into a
// Notion database page. Request/response shapes below follow
// docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md §3
// (Notion Authorization / Create a page). fetchImpl defaults to the global
// fetch but is injectable so tests can prove request shape and field-mapping
// behavior against a protocol-conformant fake transport without a live
// Notion account or token.
import { PROJECTION_STATES } from "./pm-adapter-contract.mjs";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// Canonical fields this adapter knows how to attempt. taskContainer is a
// WorkflowTaskNode/TaskContainer-shaped record; values pulled here, not
// invented -- a field with no source value is UNPROJECTABLE, not skipped
// silently.
const CANONICAL_FIELDS = ["title", "summary", "state", "assigneeId", "backlink"];

function truncate(value, max) {
  return String(value ?? "").slice(0, max);
}

// Notion property builders. "title"/"rich_text"/"url"/"checkbox" round-trip
// losslessly for the value shapes GoVibe sends, so they classify FULL.
// "select"/"status" require the option to already exist (or Notion
// auto-creates it, which changes the target schema as a side effect) --
// never guaranteed lossless, so APPROXIMATE.
const NOTION_PROPERTY_BUILDERS = {
  title: { build: (value) => ({ title: [{ text: { content: truncate(value, 2000) } }] }), state: PROJECTION_STATES.FULL },
  rich_text: { build: (value) => ({ rich_text: [{ text: { content: truncate(value, 2000) } }] }), state: PROJECTION_STATES.FULL },
  select: { build: (value) => ({ select: { name: truncate(value, 100) } }), state: PROJECTION_STATES.APPROXIMATE },
  status: { build: (value) => ({ status: { name: truncate(value, 100) } }), state: PROJECTION_STATES.APPROXIMATE },
  url: { build: (value) => ({ url: value ? String(value) : null }), state: PROJECTION_STATES.FULL },
  checkbox: { build: (value) => ({ checkbox: Boolean(value) }), state: PROJECTION_STATES.FULL },
};

export class NotionAdapter {
  constructor({ fetchImpl = fetch, apiBase = NOTION_API_BASE } = {}) {
    this.fetchImpl = fetchImpl;
    this.apiBase = apiBase;
  }

  async projectTask(taskContainer, config) {
    // Defensive invariants -- PmAdapterRegistry.exportTask already fails
    // closed on a missing config object, but a config missing the fields
    // *this* platform needs is still a caller error, not silently ignorable.
    if (!config?.token) throw new Error("Notion connector config requires a token.");
    if (!config?.databaseId) throw new Error("Notion connector config requires a databaseId.");

    const fieldMap = config.fieldMap ?? {};
    const values = {
      title: taskContainer.title,
      summary: taskContainer.summary,
      state: taskContainer.state,
      assigneeId: taskContainer.assigneeId,
      backlink: taskContainer.id,
    };

    const properties = {};
    const fieldProjections = [];
    for (const field of CANONICAL_FIELDS) {
      const mapping = fieldMap[field];
      const value = values[field];
      if (!mapping) {
        fieldProjections.push({ field, state: PROJECTION_STATES.UNPROJECTABLE, note: "no target property mapped" });
        continue;
      }
      if (value === undefined || value === null || value === "") {
        fieldProjections.push({ field, state: PROJECTION_STATES.UNPROJECTABLE, note: "no source value present" });
        continue;
      }
      const builder = NOTION_PROPERTY_BUILDERS[mapping.type];
      if (!builder) {
        fieldProjections.push({ field, state: PROJECTION_STATES.UNPROJECTABLE, note: `unsupported Notion property type "${mapping.type}"` });
        continue;
      }
      properties[mapping.property] = builder.build(value);
      fieldProjections.push({ field, state: builder.state, note: mapping.property });
    }

    const response = await this.fetchImpl(`${this.apiBase}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parent: { database_id: config.databaseId }, properties }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Notion page create failed (${response.status}): ${detail.slice(0, 500)}`);
    }
    const page = await response.json();

    return {
      platform: "notion",
      taskId: taskContainer.id,
      externalId: page.id,
      url: page.url ?? null,
      backlink: taskContainer.id,
      fieldProjections,
    };
  }

  // Notion's public API has no generic "pages changed since" primitive in
  // the surface this adapter targets (a full workspace-search-based poll is
  // a different, heavier integration not in this contract version). Return
  // [] honestly rather than fabricating observed changes.
  async pullObservedChanges() {
    return [];
  }
}
