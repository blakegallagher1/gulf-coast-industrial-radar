/**
 * Signal taxonomy — mirrors knowledge/sources/signal-taxonomy.md
 *
 * Score is the weighted sum across signal families that fire. The weights
 * here are starting weights per the spec; they're tuned by backtest.
 */

export const SIGNAL_FAMILIES = [
  "LAND_CONTROL",
  "ENTITY_FORMATION",
  "ENVIRONMENTAL_PERMIT",
  "INCENTIVE",
  "UTILITY_POWER",
  "PORT_TERMINAL",
  "PUBLIC_COMPANY",
  "LOCAL_AGENDA",
  "FINANCING",
  "PROCUREMENT",
] as const;
export type SignalFamily = (typeof SIGNAL_FAMILIES)[number];

export const SIGNAL_FAMILY_LABELS: Record<SignalFamily, string> = {
  LAND_CONTROL: "Land control",
  ENTITY_FORMATION: "Entity formation",
  ENVIRONMENTAL_PERMIT: "Environmental permits",
  INCENTIVE: "Incentives",
  UTILITY_POWER: "Utility / power",
  PORT_TERMINAL: "Port / terminal",
  PUBLIC_COMPANY: "SEC / corporate",
  LOCAL_AGENDA: "Local agendas",
  FINANCING: "Financing",
  PROCUREMENT: "Procurement",
};

/** Starting weights — must sum to 100; tuned by backtest. */
export const SIGNAL_WEIGHTS: Record<SignalFamily, number> = {
  LAND_CONTROL: 25,
  ENVIRONMENTAL_PERMIT: 15,
  INCENTIVE: 15,
  UTILITY_POWER: 15,
  ENTITY_FORMATION: 10,
  LOCAL_AGENDA: 8,
  PORT_TERMINAL: 8,
  FINANCING: 7,
  PUBLIC_COMPANY: 7,
  PROCUREMENT: 5,
};

export const PROJECT_STAGES = [
  "WATCH",
  "SITE_CONTROL",
  "ENTITY_FORMED",
  "INCENTIVE_SURFACED",
  "PERMIT_SURFACED",
  "WETLANDS_WATERWAY_SURFACED",
  "UTILITY_SURFACED",
  "PORT_AGENDA_SURFACED",
  "FINANCING_SURFACED",
  "PUBLIC_ANNOUNCED",
  "FID",
  "EPC",
  "CONSTRUCTION",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  WATCH: "watch",
  SITE_CONTROL: "site-control",
  ENTITY_FORMED: "entity-formed",
  INCENTIVE_SURFACED: "incentive-surfaced",
  PERMIT_SURFACED: "permit-surfaced",
  WETLANDS_WATERWAY_SURFACED: "wetlands-waterway-surfaced",
  UTILITY_SURFACED: "utility-surfaced",
  PORT_AGENDA_SURFACED: "port-agenda-surfaced",
  FINANCING_SURFACED: "financing-surfaced",
  PUBLIC_ANNOUNCED: "public-announced",
  FID: "FID",
  EPC: "EPC",
  CONSTRUCTION: "construction",
};

/** Stage badge color tokens — used by the alert chip + drawer. */
export const STAGE_COLOR: Record<ProjectStage, string> = {
  WATCH: "#a8a29e",
  SITE_CONTROL: "#10a37f",
  ENTITY_FORMED: "#6b6b6b",
  INCENTIVE_SURFACED: "#ca8a04",
  PERMIT_SURFACED: "#1f5fa8",
  WETLANDS_WATERWAY_SURFACED: "#0e7490",
  UTILITY_SURFACED: "#7e22ce",
  PORT_AGENDA_SURFACED: "#0891b2",
  FINANCING_SURFACED: "#b3261e",
  PUBLIC_ANNOUNCED: "#0d0d0d",
  FID: "#0d0d0d",
  EPC: "#0d0d0d",
  CONSTRUCTION: "#0d0d0d",
};

/** Score bands — radar markers and chips use these. */
export type ScoreBand = "high" | "elevated" | "watch" | "weak" | "noise";
export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return "high";
  if (score >= 75) return "elevated";
  if (score >= 60) return "watch";
  if (score >= 40) return "weak";
  return "noise";
}
export const BAND_LABEL: Record<ScoreBand, string> = {
  high: "Active formation",
  elevated: "Site-control / permitting",
  watch: "Watchlist",
  weak: "Early / weak",
  noise: "Background",
};
export const BAND_COLOR: Record<ScoreBand, string> = {
  high: "#b3261e",
  elevated: "#c97a16",
  watch: "#1f5fa8",
  weak: "#a8a29e",
  noise: "#d4d4d4",
};

/** Recommended-action kinds (mirrors investor-action-logic.md). */
export const ACTION_KINDS = [
  "MAP_ADJACENT_PARCELS",
  "IDENTIFY_OWNERS",
  "ESTIMATE_ASSEMBLAGE_VALUE",
  "CHECK_ZONING",
  "CHECK_FLOOD_WETLANDS",
  "CALL_BROKER_OWNER",
  "MONITOR_NEXT_BOARD",
  "PREPARE_OPTION_STRATEGY",
  "PURSUE_ENTITLEMENT",
  "PASS",
  "ESCALATE_ANALYST",
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];
