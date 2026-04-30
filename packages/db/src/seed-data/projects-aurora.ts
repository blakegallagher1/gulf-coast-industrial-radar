/**
 * Aurora Steel Donaldsonville — the live "today" formation case.
 *
 * Quiet land assembly forming in Ascension Parish · Donaldsonville corridor:
 * 5 Crescent Industrial Holdings LLCs, ~1,247 ac across 7+ parcel transfers,
 * IDB notice surfaced 2026-04-28. Used as the canonical demo fixture.
 */

import {
  Confidence,
  ProjectStage,
  SignalFamily,
  ActionKind,
} from "../index";
import type { ProjectFixture } from "./types";

export const auroraProject: ProjectFixture = {
  publicId: "PRJ-2026-08114",
  name: "Aurora Steel Donaldsonville",
  status: "suspected",
  stage: ProjectStage.FINANCING_SURFACED,
  confidence: Confidence.HIGH,
  score: 94,
  estimatedCapex: "$4.2B",
  estimatedJobs: 412,
  facilityType: "Primary metals / DRI",
  parishCounty: "Ascension",
  state: "LA",
  corridor: "Ascension / River corridor",
  centerLat: 30.0998,
  centerLng: -90.9923,
  totalAcres: 1247,
  buyers: [
    "Crescent Industrial Holdings I LLC",
    "Crescent Industrial Holdings II LLC",
    "Crescent Industrial Holdings III LLC",
    "Crescent Industrial Holdings IV LLC",
    "Crescent Industrial Holdings V LLC",
  ],
  firstSignalAt: "2025-09-14",
  signals: [
    { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer",         subjectLabel: "0414-007 · 173.4 ac",  observedAt: "2025-09-14", weight: 25, confidence: 0.99, sourceSlug: "ascension-assessor" },
    { family: SignalFamily.ENTITY_FORMATION,predicate: "entity.formed",         subjectLabel: "Crescent Industrial Hldgs I/II/III LLC", observedAt: "2025-09-28", weight: 10, confidence: 0.98, sourceSlug: "la-sos" },
    { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer",         subjectLabel: "0414-008 · 121.2 ac",  observedAt: "2025-11-19", weight: 25, confidence: 0.96, sourceSlug: "ascension-assessor" },
    { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer.bulk",    subjectLabel: "0414-009/010/011 · 612 ac", observedAt: "2025-12-11", weight: 25, confidence: 0.98, sourceSlug: "ascension-assessor" },
    { family: SignalFamily.ENTITY_FORMATION,predicate: "entity.formed",         subjectLabel: "Crescent Industrial Hldgs IV LLC", observedAt: "2026-02-06", weight: 10, confidence: 0.99, sourceSlug: "la-sos" },
    { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer",         subjectLabel: "0414-013 · 142.0 ac",  observedAt: "2026-02-18", weight: 25, confidence: 0.95, sourceSlug: "ascension-assessor" },
    { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer",         subjectLabel: "0414-014 · 198.4 ac",  observedAt: "2026-03-04", weight: 25, confidence: 0.97, sourceSlug: "ascension-assessor" },
    { family: SignalFamily.ENVIRONMENTAL_PERMIT, predicate: "permit.air.NOI",   subjectLabel: "Class III air NOI · primary metals reduction", observedAt: "2026-03-18", weight: 15, confidence: 0.96, sourceSlug: "ldeq-edms" },
    { family: SignalFamily.INCENTIVE,       predicate: "incentive.itep.eligible", subjectLabel: "ITEP $4.2B tier · primary metals · Ascension", observedAt: "2026-03-23", weight: 15, confidence: 0.88, sourceSlug: "led-fastlane" },
    { family: SignalFamily.UTILITY_POWER,   predicate: "utility.interconnection",subjectLabel: "Entergy LA · 380 MW · Donaldsonville sub", observedAt: "2026-04-09", weight: 15, confidence: 0.91, sourceSlug: "lpsc" },
    { family: SignalFamily.FINANCING,       predicate: "financing.idb.notice",  subjectLabel: "Project Aurora · IDB $4.2B notional", observedAt: "2026-04-28", weight: 7, confidence: 0.94, sourceSlug: "la-bond-commission" },
  ],
  recommendedActions: [
    { kind: ActionKind.PREPARE_OPTION_STRATEGY, title: "Option-pursue 1.5-mile ring · 14 parcels · ~1,260 acres", rationale: "Adjacent owners are likely option targets within 30-60 days. Reachable through 6 local owners and 4 out-of-state holding LLCs.", confidence: 0.91, rank: 1 },
    { kind: ActionKind.CHECK_ZONING, title: "Pull title and ownership history on parcel 0414-031", rationale: "211-acre parcel with rail and river frontage that breaks the assembly's southern corridor. Owner is a Delaware fund with active litigation.", confidence: 0.74, rank: 2 },
    { kind: ActionKind.MONITOR_NEXT_BOARD, title: "Attend Bond Commission hearing · May 14 · 9:30 CDT", rationale: "Agenda item references the project by metes-and-bounds, not by company. Company name likely disclosed at hearing.", confidence: 0.86, rank: 3 },
    { kind: ActionKind.CALL_BROKER_OWNER, title: "Skip-trace and outreach to Babineaux Family Trust (parcel 0414-016)", rationale: "156.8 acres directly north of the assembly. Local Donaldsonville mailing, multi-generational holder.", confidence: 0.83, rank: 4 },
    { kind: ActionKind.PASS, title: "Pass on parcel 0414-038 — flood & wetlands", rationale: "FEMA AE zone with 0.6 ac of NWI wetlands. Section 404 timeline likely >18 months.", confidence: 0.78, rank: 5 },
  ],
};
