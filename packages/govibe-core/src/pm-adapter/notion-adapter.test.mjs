import { describe, expect, it, vi } from "vitest";
import { NotionAdapter } from "./notion-adapter.mjs";
import { PROJECTION_STATES } from "./pm-adapter-contract.mjs";

// Response shape follows docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md
// §3 "Create a page" -- a protocol-conformant fake, not a live Notion account.
function fakeFetch({ status = 200, body = { id: "page-abc", url: "https://notion.so/page-abc" } } = {}) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

const TASK = { id: "GLS-005", title: "PmAdapter contract", summary: "Outbound-first projection", state: "in_progress", assigneeId: "ARCHON" };

const FIELD_MAP = {
  title: { property: "Name", type: "title" },
  summary: { property: "Description", type: "rich_text" },
  state: { property: "Status", type: "select" },
  backlink: { property: "GoVibe Task ID", type: "rich_text" },
};

describe("NotionAdapter.projectTask", () => {
  it("requires a token and a databaseId before attempting any network call", async () => {
    const fetchImpl = fakeFetch();
    const adapter = new NotionAdapter({ fetchImpl });
    await expect(adapter.projectTask(TASK, { databaseId: "db-1" })).rejects.toThrow(/requires a token/);
    await expect(adapter.projectTask(TASK, { token: "t" })).rejects.toThrow(/requires a databaseId/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("POSTs to /v1/pages with the documented auth header, Notion-Version, and parent database", async () => {
    const fetchImpl = fakeFetch();
    const adapter = new NotionAdapter({ fetchImpl, apiBase: "https://api.notion.com/v1" });
    await adapter.projectTask(TASK, { token: "secret_abc", databaseId: "db-1", fieldMap: FIELD_MAP });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer secret_abc");
    expect(init.headers["Notion-Version"]).toBe("2022-06-28");
    const body = JSON.parse(init.body);
    expect(body.parent).toEqual({ database_id: "db-1" });
    expect(body.properties.Name).toEqual({ title: [{ text: { content: "PmAdapter contract" } }] });
    expect(body.properties.Description).toEqual({ rich_text: [{ text: { content: "Outbound-first projection" } }] });
    expect(body.properties.Status).toEqual({ select: { name: "in_progress" } });
    expect(body.properties["GoVibe Task ID"]).toEqual({ rich_text: [{ text: { content: "GLS-005" } }] });
  });

  it("returns the backlink, externalId, and url the reference doc names as the projection's usable output", async () => {
    const adapter = new NotionAdapter({ fetchImpl: fakeFetch({ body: { id: "page-xyz", url: "https://notion.so/page-xyz" } }) });
    const result = await adapter.projectTask(TASK, { token: "t", databaseId: "db-1", fieldMap: FIELD_MAP });
    expect(result).toMatchObject({ platform: "notion", taskId: "GLS-005", externalId: "page-xyz", url: "https://notion.so/page-xyz", backlink: "GLS-005" });
  });

  it("classifies every canonical field's projection state -- title/rich_text FULL, select APPROXIMATE, unmapped/missing UNPROJECTABLE", async () => {
    const adapter = new NotionAdapter({ fetchImpl: fakeFetch() });
    const result = await adapter.projectTask(TASK, { token: "t", databaseId: "db-1", fieldMap: FIELD_MAP });
    const byField = Object.fromEntries(result.fieldProjections.map((p) => [p.field, p.state]));
    expect(byField.title).toBe(PROJECTION_STATES.FULL);
    expect(byField.summary).toBe(PROJECTION_STATES.FULL);
    expect(byField.state).toBe(PROJECTION_STATES.APPROXIMATE);
    expect(byField.backlink).toBe(PROJECTION_STATES.FULL);
    // assigneeId has no entry in FIELD_MAP -- must be reported, not dropped.
    expect(byField.assigneeId).toBe(PROJECTION_STATES.UNPROJECTABLE);
  });

  it("marks a field UNPROJECTABLE when a target property is mapped but the source value is absent", async () => {
    const adapter = new NotionAdapter({ fetchImpl: fakeFetch() });
    const result = await adapter.projectTask({ id: "GLS-005", title: "X" }, { token: "t", databaseId: "db-1", fieldMap: FIELD_MAP });
    const byField = Object.fromEntries(result.fieldProjections.map((p) => [p.field, p.state]));
    expect(byField.summary).toBe(PROJECTION_STATES.UNPROJECTABLE);
  });

  it("marks a field UNPROJECTABLE for an unsupported Notion property type rather than throwing or silently dropping it", async () => {
    const adapter = new NotionAdapter({ fetchImpl: fakeFetch() });
    const result = await adapter.projectTask(TASK, { token: "t", databaseId: "db-1", fieldMap: { title: { property: "Name", type: "formula" } } });
    const titleProjection = result.fieldProjections.find((p) => p.field === "title");
    expect(titleProjection.state).toBe(PROJECTION_STATES.UNPROJECTABLE);
    expect(titleProjection.note).toMatch(/unsupported Notion property type/);
  });

  it("surfaces a non-ok Notion response as a thrown error carrying the status code, never a fabricated success", async () => {
    const adapter = new NotionAdapter({ fetchImpl: fakeFetch({ status: 401, body: { message: "unauthorized" } }) });
    await expect(adapter.projectTask(TASK, { token: "bad", databaseId: "db-1", fieldMap: FIELD_MAP })).rejects.toThrow(/Notion page create failed \(401\)/);
  });

  it("pullObservedChanges returns [] honestly (no generic changed-since primitive implemented yet)", async () => {
    const adapter = new NotionAdapter({ fetchImpl: fakeFetch() });
    await expect(adapter.pullObservedChanges()).resolves.toEqual([]);
  });
});
