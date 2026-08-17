import { describe, expect, it, vi } from "vitest";
import { JiraAdapter } from "./jira-adapter.mjs";
import { PROJECTION_STATES } from "./pm-adapter-contract.mjs";

// Response shape follows docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md
// §4 (issue create) -- a protocol-conformant fake, not a live Jira account.
function fakeFetch({ status = 201, body = { id: "10001", key: "PROJ-42" } } = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

const TASK = { id: "GLS-005", title: "PmAdapter contract", summary: "Outbound-first projection", state: "in_progress", assigneeId: "5b10a2844c20165700ede21g" };

describe("JiraAdapter.projectTask", () => {
  it("requires accessToken, cloudId, and projectKey before attempting any network call", async () => {
    const fetchImpl = fakeFetch();
    const adapter = new JiraAdapter({ fetchImpl });
    await expect(adapter.projectTask(TASK, { cloudId: "c1", projectKey: "PROJ" })).rejects.toThrow(/requires an accessToken/);
    await expect(adapter.projectTask(TASK, { accessToken: "t", projectKey: "PROJ" })).rejects.toThrow(/requires a cloudId/);
    await expect(adapter.projectTask(TASK, { accessToken: "t", cloudId: "c1" })).rejects.toThrow(/requires a projectKey/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("POSTs to the accessible-resources-scoped issue endpoint with the documented auth header and project/issuetype", async () => {
    const fetchImpl = fakeFetch();
    const adapter = new JiraAdapter({ fetchImpl });
    await adapter.projectTask(TASK, { accessToken: "atl-token", cloudId: "cloud-1", projectKey: "PROJ" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.atlassian.com/ex/jira/cloud-1/rest/api/2/issue");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer atl-token");
    const body = JSON.parse(init.body);
    expect(body.fields.project).toEqual({ key: "PROJ" });
    expect(body.fields.issuetype).toEqual({ name: "Task" });
    expect(body.fields.summary).toBe("PmAdapter contract");
  });

  it("returns externalId as the issue key and builds the browse URL from a pre-resolved siteUrl", async () => {
    const adapter = new JiraAdapter({ fetchImpl: fakeFetch({ body: { id: "10001", key: "PROJ-42" } }) });
    const result = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ", siteUrl: "https://acme.atlassian.net" });
    expect(result).toMatchObject({ platform: "jira", taskId: "GLS-005", externalId: "PROJ-42", url: "https://acme.atlassian.net/browse/PROJ-42", backlink: "GLS-005" });
  });

  it("returns a null url when no siteUrl is supplied, rather than guessing one", async () => {
    const adapter = new JiraAdapter({ fetchImpl: fakeFetch() });
    const result = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ" });
    expect(result.url).toBeNull();
  });

  it("classifies title FULL (summary), summary FULL (description), state PARTIAL (workflow-transition-driven, not a create-time field), never silently dropped", async () => {
    const adapter = new JiraAdapter({ fetchImpl: fakeFetch() });
    const result = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ" });
    const byField = Object.fromEntries(result.fieldProjections.map((p) => [p.field, p.state]));
    expect(byField.title).toBe(PROJECTION_STATES.FULL);
    expect(byField.summary).toBe(PROJECTION_STATES.FULL);
    expect(byField.state).toBe(PROJECTION_STATES.PARTIAL);
  });

  it("folds the backlink into the description as APPROXIMATE when no custom field is mapped, and uses the custom field as FULL when one is", async () => {
    const fetchImpl = fakeFetch();
    const adapter = new JiraAdapter({ fetchImpl });

    const noMapResult = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ" });
    const noMapBacklink = noMapResult.fieldProjections.find((p) => p.field === "backlink");
    expect(noMapBacklink.state).toBe(PROJECTION_STATES.APPROXIMATE);
    const [, noMapInit] = fetchImpl.mock.calls[0];
    expect(JSON.parse(noMapInit.body).fields.description).toContain("GoVibe Task: GLS-005");

    const mappedResult = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ", fieldMap: { backlink: "customfield_10050" } });
    const mappedBacklink = mappedResult.fieldProjections.find((p) => p.field === "backlink");
    expect(mappedBacklink.state).toBe(PROJECTION_STATES.FULL);
    const [, mappedInit] = fetchImpl.mock.calls[1];
    expect(JSON.parse(mappedInit.body).fields.customfield_10050).toBe("GLS-005");
  });

  it("classifies assigneeId UNPROJECTABLE with no field mapped, APPROXIMATE (requires a valid accountId) when mapped", async () => {
    const fetchImpl = fakeFetch();
    const adapter = new JiraAdapter({ fetchImpl });
    const unmapped = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ" });
    expect(unmapped.fieldProjections.find((p) => p.field === "assigneeId").state).toBe(PROJECTION_STATES.UNPROJECTABLE);

    const mapped = await adapter.projectTask(TASK, { accessToken: "t", cloudId: "cloud-1", projectKey: "PROJ", fieldMap: { assigneeId: "assignee" } });
    expect(mapped.fieldProjections.find((p) => p.field === "assigneeId").state).toBe(PROJECTION_STATES.APPROXIMATE);
    const [, init] = fetchImpl.mock.calls[1];
    expect(JSON.parse(init.body).fields.assignee).toEqual({ accountId: TASK.assigneeId });
  });

  it("surfaces a non-ok Jira response as a thrown error carrying the status code, never a fabricated success", async () => {
    const adapter = new JiraAdapter({ fetchImpl: fakeFetch({ status: 401, body: { errorMessages: ["unauthorized"] } }) });
    await expect(adapter.projectTask(TASK, { accessToken: "bad", cloudId: "cloud-1", projectKey: "PROJ" })).rejects.toThrow(/Jira issue create failed \(401\)/);
  });

  it("pullObservedChanges returns [] honestly (JQL-based changed-since poll not implemented yet)", async () => {
    const adapter = new JiraAdapter({ fetchImpl: fakeFetch() });
    await expect(adapter.pullObservedChanges()).resolves.toEqual([]);
  });
});
