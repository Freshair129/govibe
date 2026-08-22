import { describe, expect, it } from "vitest";
import { selectBoundedNodes } from "./bounded-nodes";

describe("selectBoundedNodes", () => {
  it("shows every item and reports not truncated when the set is under the limit", () => {
    const result = selectBoundedNodes([1, 2, 3], 10);
    expect(result).toEqual({ shown: [1, 2, 3], total: 3, limit: 10, truncated: false });
  });

  it("shows every item and reports not truncated when the set exactly equals the limit", () => {
    const result = selectBoundedNodes([1, 2, 3], 3);
    expect(result).toEqual({ shown: [1, 2, 3], total: 3, limit: 3, truncated: false });
  });

  it("bounds the shown set and reports truncated when the set exceeds the limit", () => {
    const items = Array.from({ length: 3205 }, (_, i) => i);
    const result = selectBoundedNodes(items, 300);
    expect(result.shown).toHaveLength(300);
    expect(result.shown[0]).toBe(0);
    expect(result.shown[299]).toBe(299);
    expect(result.total).toBe(3205);
    expect(result.truncated).toBe(true);
  });

  it("treats a negative or fractional limit as zero/floored rather than throwing", () => {
    expect(selectBoundedNodes([1, 2, 3], -5)).toEqual({ shown: [], total: 3, limit: 0, truncated: true });
    expect(selectBoundedNodes([1, 2, 3], 1.9)).toEqual({ shown: [1], total: 3, limit: 1, truncated: true });
  });

  it("handles an empty input set", () => {
    expect(selectBoundedNodes([], 50)).toEqual({ shown: [], total: 0, limit: 50, truncated: false });
  });
});
