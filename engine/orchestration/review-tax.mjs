// Review-tax + L0-savings analytics (FEAT-TIERED-REVIEW FR-005) — pure function over usage.jsonl
// rows. Surfaces the review tax (frontier review $ as a share of spend) and the savings the L0
// deterministic gate produced by catching failures before the paid reviewer.
//
// `avertedEst` is a COUNTERFACTUAL estimate: each L0-caught failure (`#l0` with verdict `fail`)
// would otherwise have consumed one frontier review at the measured average review cost. It is an
// estimate, kept separate from measured spend, in the honest-by-design spirit of the cost meter.

// refReviewCost: a measured reference frontier-review cost (~$0.74/review observed in this repo's
// RM-008 runs), used to estimate averted savings ONLY when the current ledger has no review of its
// own — which is exactly the case when L0 caught everything before any reviewer ran.
export function analyzeReviewTax(rows, { refReviewCost = 0.74 } = {}) {
  let totalSpend = 0, reviewSpend = 0, reviewRuns = 0, l0Runs = 0, l0Fails = 0;
  for (const r of rows) {
    const id = String(r.id || ""), model = String(r.model || "");
    if (model.startsWith("deterministic:l0") || id.includes("#l0")) {
      l0Runs++;
      if (model.includes("l0:fail")) l0Fails++;
      continue;                                  // L0 itself is $0; never counted as spend
    }
    totalSpend += r.cost || 0;
    if (id.includes("#review")) { reviewSpend += r.cost || 0; reviewRuns++; }
  }
  const avgReviewMeasured = reviewRuns ? reviewSpend / reviewRuns : 0;
  const avgReviewIsReference = reviewRuns === 0;
  const avgReviewUsed = reviewRuns ? avgReviewMeasured : refReviewCost;   // fall back to reference if L0 caught all
  const reviewTaxPct = totalSpend ? (reviewSpend / totalSpend) * 100 : 0;
  const avertedEst = l0Fails * avgReviewUsed;
  // review tax that WOULD have applied if L0 had not caught those failures
  const reviewTaxWithoutL0Pct = (totalSpend + avertedEst)
    ? ((reviewSpend + avertedEst) / (totalSpend + avertedEst)) * 100 : 0;
  return {
    totalSpend, reviewSpend, reviewRuns, avgReviewMeasured, avgReviewUsed, avgReviewIsReference,
    reviewTaxPct, l0Runs, l0Fails, avertedEst, reviewTaxWithoutL0Pct,
  };
}
