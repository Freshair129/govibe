import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoadmapSnapshot } from "./mission";
import { downloadRoadmapExport } from "./roadmapExport";

class FakeBlob {
  parts: unknown[];
  options?: BlobPropertyBag;

  constructor(parts: unknown[], options?: BlobPropertyBag) {
    this.parts = parts;
    this.options = options;
  }
}

function createSnapshot(): RoadmapSnapshot {
  return {
    sourcePath: "docs/roadmap/ROADMAP-example.md",
    sourceType: "markdown",
    sourceVersion: "1.2.3",
    approvalStatus: "approved",
    updatedAt: "2026-06-19T12:00:00.000Z",
    nodes: [
      {
        id: "task-1",
        type: "task",
        title: "Example task",
        state: "done",
        progress: 100,
        sourceSection: "Runtime Core",
      },
    ],
    assignments: [],
    handoffs: [],
    verifications: [],
  };
}

describe("downloadRoadmapExport", () => {
  const OriginalBlob = globalThis.Blob;
  const createObjectURL = vi.fn(() => "blob:govibe-export");
  const revokeObjectURL = vi.fn();
  const click = vi.fn();
  const createdBlobs: FakeBlob[] = [];

  beforeEach(() => {
    createdBlobs.length = 0;
    class TestBlob extends FakeBlob {
      constructor(parts: unknown[], options?: BlobPropertyBag) {
        super(parts, options);
        createdBlobs.push(this);
      }
    }

    vi.stubGlobal("Blob", TestBlob as unknown as typeof Blob);
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    globalThis.Blob = OriginalBlob;
    createObjectURL.mockReset();
    revokeObjectURL.mockReset();
    click.mockReset();
  });

  it("downloads markdown with the expected filename and source content", () => {
    downloadRoadmapExport(
      createSnapshot(),
      {
        totalFeatures: 1,
        readyFeatures: 1,
        backlogTasks: 0,
        progress: 100,
        label: "100% Live",
      },
      "md",
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createdBlobs[0];
    const content = String(blob.parts[0]);

    expect(blob.options?.type).toBe("text/markdown;charset=utf-8");
    expect(content).toContain("# GoVibe Development Roadmap");
    expect(content).toContain("- Source: docs/roadmap/ROADMAP-example.md");
    expect(content).toContain("### Example task");

    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("govibe-roadmap-export.md");
    expect(anchor.href).toBe("blob:govibe-export");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:govibe-export");
  });

  it("downloads yaml with the expected mime type and approval metadata", () => {
    downloadRoadmapExport(
      createSnapshot(),
      {
        totalFeatures: 1,
        readyFeatures: 1,
        backlogTasks: 0,
        progress: 100,
        label: "100% Live",
      },
      "yaml",
    );

    const blob = createdBlobs[0];
    const content = String(blob.parts[0]);

    expect(blob.options?.type).toBe("text/yaml;charset=utf-8");
    expect(content).toContain("approvalStatus: \"approved\"");
    expect(content).toContain("sourceVersion: \"1.2.3\"");
    expect(content).toContain("title: \"GoVibe Development Roadmap\"");
  });
});
