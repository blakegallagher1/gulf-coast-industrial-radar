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

/** Stage badge color tokens — used by the alert chip + drawer.
 *  Pilot House palette: phosphor amber for signal, cinnabar for hazard,
 *  patina teal for watch, ochre & violet for permits, ink for confirmed. */
export const STAGE_COLOR: Record<ProjectStage, string> = {
  WATCH: "#9aa39e",
  SITE_CONTROL: "#2f7575",
  ENTITY_FORMED: "#7a847f",
  INCENTIVE_SURFACED: "#a87016",
  PERMIT_SURFACED: "#3b6ea5",
  WETLANDS_WATERWAY_SURFACED: "#317b85",
  UTILITY_SURFACED: "#7a4ab8",
  PORT_AGENDA_SURFACED: "#1f8aa3",
  FINANCING_SURFACED: "#c9402a",
  PUBLIC_ANNOUNCED: "#0c100e",
  FID: "#0c100e",
  EPC: "#0c100e",
  CONSTRUCTION: "#0c100e",
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
  high: "#c9402a",       // cinnabar — hazard / hot formation
  elevated: "#e9a539",   // phosphor amber — primary signal
  watch: "#2f7575",      // patina teal — being watched
  weak: "#7a847f",       // muted green-grey — early / weak
  noise: "#9aa39e",      // muted-2 — background
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
