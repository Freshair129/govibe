// JiraAdapter: outbound projection of a canonical GoVibe task into a Jira
// Cloud issue. Request shape and endpoint follow
// docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md §4 (OAuth
// 2.0 3LO, accessible-resources cloudId resolution, issue create). Per §4.1,
// this adapter's caller is responsible for requesting the classic
// write:jira-work scope, not granular write:issue:jira, given the reported
// granular-scope POST 401 issue -- scope selection happens at connect time,
// outside this contract.
import { PROJECTION_STATES } from "./pm-adapter-contract.mjs";

const jiraApiBase = (cloudId) => `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2`;

export class JiraAdapter {
  constructor({ fetchImpl = fetch } = {}) {
    this.fetchImpl = fetchImpl;
  }

  async projectTask(taskContainer, config) {
    if (!config?.accessToken) throw new Error("Jira connector config requires an accessToken.");
    if (!config?.cloudId) throw new Error("Jira connector config requires a cloudId (resolved via GET accessible-resources).");
    if (!config?.projectKey) throw new Error("Jira connector config requires a projectKey.");

    const issueType = config.issueType ?? "Task";
    const fieldMap = config.fieldMap ?? {};
    const fields = { project: { key: config.projectKey }, issuetype: { name: issueType } };
    const fieldProjections = [];

    // title -> Jira's structural "summary" field. Not configurable: every
    // Jira issue type has exactly one summary field.
    if (taskContainer.title) {
      fields.summary = String(taskContainer.title).slice(0, 255);
      fieldProjections.push({ field: "title", state: PROJECTION_STATES.FULL, note: "summary" });
    } else {
      fieldProjections.push({ field: "title", state: PROJECTION_STATES.UNPROJECTABLE, note: "no source value present" });
    }

    // GoVibe's summary -> Jira's description. The name collision with
    // Jira's own "summary" field is deliberate context for readers of this
    // mapping, not a bug: these are two different fields on two sides.
    let description = taskContainer.summary ? String(taskContainer.summary) : "";
    if (taskContainer.summary) {
      fieldProjections.push({ field: "summary", state: PROJECTION_STATES.FULL, note: "description" });
    } else {
      fieldProjections.push({ field: "summary", state: PROJECTION_STATES.UNPROJECTABLE, note: "no source value present" });
    }

    // GoVibe workflow state has 13 possible values with no fixed Jira
    // workflow equivalent, and Jira status is transition-driven, not a
    // create-time field -- there is nowhere to write it at create time.
    // Recorded as PARTIAL (observed, not silently dropped), never forced
    // into a field it doesn't belong in.
    if (taskContainer.state) {
      fieldProjections.push({ field: "state", state: PROJECTION_STATES.PARTIAL, note: "Jira status is workflow-transition-driven; not set at create time" });
    } else {
      fieldProjections.push({ field: "state", state: PROJECTION_STATES.UNPROJECTABLE, note: "no source value present" });
    }

    if (taskContainer.assigneeId && fieldMap.assigneeId) {
      fields[fieldMap.assigneeId] = { accountId: taskContainer.assigneeId };
      fieldProjections.push({ field: "assigneeId", state: PROJECTION_STATES.APPROXIMATE, note: "requires assigneeId to already be a valid Jira accountId" });
    } else {
      fieldProjections.push({ field: "assigneeId", state: PROJECTION_STATES.UNPROJECTABLE, note: !fieldMap.assigneeId ? "no target field mapped" : "no source value present" });
    }

    // Prefer a dedicated custom field for the backlink (FULL fidelity, a
    // real structured field). With none configured, fold it into the
    // description text so the backlink is never silently dropped -- but
    // record the degraded fidelity honestly as APPROXIMATE.
    if (fieldMap.backlink) {
      fields[fieldMap.backlink] = taskContainer.id;
      fieldProjections.push({ field: "backlink", state: PROJECTION_STATES.FULL, note: fieldMap.backlink });
    } else {
      description = `${description}\n\nGoVibe Task: ${taskContainer.id}`.trim();
      fieldProjections.push({ field: "backlink", state: PROJECTION_STATES.APPROXIMATE, note: "no custom field mapped; folded into description text" });
    }
    if (description) fields.description = description;

    const response = await this.fetchImpl(`${jiraApiBase(config.cloudId)}/issue`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Jira issue create failed (${response.status}): ${detail.slice(0, 500)}`);
    }
    const issue = await response.json();

    return {
      platform: "jira",
      taskId: taskContainer.id,
      externalId: issue.key ?? issue.id,
      // accessible-resources returns each site's own browse URL as "url";
      // callers resolve site selection before calling this adapter (§4:
      // "a connection is not complete until a site is chosen"), so the
      // adapter accepts it pre-resolved rather than re-deriving it.
      url: config.siteUrl ? `${String(config.siteUrl).replace(/\/$/, "")}/browse/${issue.key}` : null,
      backlink: taskContainer.id,
      fieldProjections,
    };
  }

  // accessible-resources + the issue search API can support a real
  // "changed since" poll, but that poll is a heavier integration (JQL
  // construction, pagination, rate-limit-aware batching per §5 of the
  // reference doc) not yet built in this contract version. Return []
  // honestly rather than fabricating observed changes.
  async pullObservedChanges() {
    return [];
  }
}
