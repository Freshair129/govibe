import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeSnapshotStore, createRuntimeSnapshot } from "./snapshot-store.mjs";
import { WorkspaceService } from "./workspace-service.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));
describe("workspace service", () => {
  it("can be instantiated and validates roots without transports or executors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.target(root)).resolves.toBe(root);
    await expect(service.target(path.parse(root).root)).rejects.toThrow("outside configured GoVibe roots");
  });
});
