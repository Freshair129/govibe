// TASK-PRD-007 (F1): GraphStudioView used to absolutely-position every node by array index
// inside an `overflow: hidden` canvas, which visually clipped to ~4 items while thousands more
// mounted invisibly in the DOM -- with no indication anything was missing. This provides an
// explicit, honest bound: render at most `limit` items and report exactly how many exist versus
// how many are shown, so the caller can render a visible truncation notice instead of a silent
// clip.

export type BoundedSelection<T> = {
  shown: T[];
  total: number;
  limit: number;
  truncated: boolean;
};

export function selectBoundedNodes<T>(items: readonly T[], limit: number): BoundedSelection<T> {
  const safeLimit = Math.max(0, Math.floor(limit));
  const shown = items.slice(0, safeLimit);
  return { shown, total: items.length, limit: safeLimit, truncated: items.length > safeLimit };
}
