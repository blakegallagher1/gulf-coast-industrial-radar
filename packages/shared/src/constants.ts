export const APP_NAME = "Gulf Coast Industrial Radar";
export const APP_TAGLINE =
  "Detect industrial demand and site-control formation early enough to buy, option, entitle, sell, or avoid land before the market prices it in.";

/** Quiet Land Assembly Detector — trigger thresholds (knowledge/product/quiet-land-assembly-detector.md). */
export const QLAD = {
  minAcresControlled: 200,
  acquisitionWindowMonths: 24,
  contiguityMaxMiles: 2,
  minInfraAssets: 2,
  buyerOpacityFloor: 0.5,
} as const;

/** Approximate lead-time goal vs. public market (sourced from prior backtests). */
export const LEAD_TIME_GOAL_WEEKS = 11;
