import { describe, expect, it } from "vitest";
import { TranslatorService } from "./translator-service.mjs";

describe("translator service", () => {
  it("ingests and renders in memory without runtime or transports", async () => {
    const service = new TranslatorService({ workspaceRoot: process.cwd(), appendProvenance: () => {} });
    const ingest = await service.ingest({ repo: "fixture", content: "# Title\nBody", lang: "md" });
    expect(ingest.atomCount).toBeGreaterThan(0);
    expect(service.render({ atomsRef: ingest.atomsRef, templateRef: ingest.templateRef }).capability).toBe("govibe.render");
  });
});
