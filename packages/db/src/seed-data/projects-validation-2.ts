/**
 * Backtest projects part 2 — validation fixtures 6-11.
 *
 * Public projects from knowledge/validation/validation-plan.md:
 *   #6  Lake Charles LNG Expansion / Energy Transfer ($13B, FID)
 *   #7  Air Products Blue Ammonia · Ascension ($4.5B, construction)
 *   #8  Rio Grande LNG · Brownsville ($18B, EPC)
 *   #9  AM/NS Calvert Expansion · Mobile ($1B, construction)
 *   #10 Entergy MS River Transmission Backbone (MISO LRTP $2.4B)
 *   #11 Port of South Louisiana · Lower MS Dredging (USACE 408)
 */

import {
  Confidence,
  ProjectStage,
  SignalFamily,
} from "../index";
import type { ProjectFixture } from "./types";

export const validationProjectsPart2: ProjectFixture[] = [
  // ── 6 · Lake Charles LNG / petrochemical expansions (composite)
  {
    publicId: "PRJ-2024-01005",
    name: "Lake Charles LNG Expansion (Energy Transfer)",
    alias: "ET LNG — Lake Charles",
    status: "confirmed",
    stage: ProjectStage.FID,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$13B",
    facilityType: "LNG export terminal",
    parishCounty: "Calcasieu",
    state: "LA",
    corridor: "Calcasieu / Cameron",
    centerLat: 29.7892,
    centerLng: -93.3411,
    totalAcres: 700,
    buyers: ["Energy Transfer LP", "Lake Charles LNG Co LLC"],
    firstSignalAt: "2017-03-01",
    publicAnnouncedAt: "2019-03-01",
    signals: [
      { family: SignalFamily.UTILITY_POWER,   predicate: "ferc.docket",         subjectLabel: "FERC docket CP15-540",      observedAt: "2017-03-01", weight: 15, confidence: 0.99, sourceSlug: "ferc-elibrary" },
      { family: SignalFamily.PUBLIC_COMPANY,  predicate: "sec.filing.10-K",     subjectLabel: "ET LNG capex disclosure",   observedAt: "2018-12-31", weight: 7, confidence: 0.99, sourceSlug: "sec-edgar" },
    ],
  },

  // ── 7 · Hydrogen / ammonia · Mississippi River corridor
  {
    publicId: "PRJ-2025-02001",
    name: "Air Products Blue Ammonia (Ascension)",
    alias: "Burnside · St. James",
    status: "confirmed",
    stage: ProjectStage.CONSTRUCTION,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$4.5B",
    facilityType: "Blue hydrogen / ammonia",
    parishCounty: "Ascension",
    state: "LA",
    corridor: "Ascension / River corridor",
    centerLat: 30.1418,
    centerLng: -90.9756,
    totalAcres: 300,
    buyers: ["Air Products & Chemicals"],
    firstSignalAt: "2021-07-12",
    publicAnnouncedAt: "2021-10-14",
    signals: [
      { family: SignalFamily.PUBLIC_COMPANY,  predicate: "sec.filing.8-K",        subjectLabel: "APD · blue ammonia announcement", observedAt: "2021-10-14", weight: 7,  confidence: 0.99, sourceSlug: "sec-edgar" },
      { family: SignalFamily.ENVIRONMENTAL_PERMIT, predicate: "permit.air.NOI",   subjectLabel: "LDEQ air NOI",                    observedAt: "2022-02-10", weight: 15, confidence: 0.96, sourceSlug: "ldeq-edms" },
      { family: SignalFamily.INCENTIVE,       predicate: "incentive.itep.approved", subjectLabel: "ITEP approval",                  observedAt: "2022-04-18", weight: 15, confidence: 0.95, sourceSlug: "la-bd-ci" },
    ],
  },

  // ── 8 · Texas Gulf Coast chemical / LNG (Rio Grande LNG)
  {
    publicId: "PRJ-2024-01007",
    name: "Rio Grande LNG · Brownsville",
    alias: "NextDecade Brownsville",
    status: "confirmed",
    stage: ProjectStage.EPC,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$18B",
    facilityType: "LNG export terminal",
    parishCounty: "Cameron, TX",
    state: "TX",
    corridor: "Houston Ship Channel / TX",
    centerLat: 25.9942,
    centerLng: -97.2123,
    totalAcres: 984,
    buyers: ["NextDecade Corp", "Rio Grande LNG LLC"],
    firstSignalAt: "2018-06-22",
    publicAnnouncedAt: "2019-04-08",
    signals: [
      { family: SignalFamily.UTILITY_POWER,   predicate: "ferc.docket",        subjectLabel: "FERC docket CP16-454",       observedAt: "2018-06-22", weight: 15, confidence: 0.99, sourceSlug: "ferc-elibrary" },
      { family: SignalFamily.ENVIRONMENTAL_PERMIT, predicate: "permit.tceq.air", subjectLabel: "TCEQ air permit",            observedAt: "2019-09-12", weight: 15, confidence: 0.95, sourceSlug: "tceq" },
    ],
  },

  // ── 9 · Mobile / Pascagoula port industrial expansion (AM/NS / SSAB)
  {
    publicId: "PRJ-2024-01008",
    name: "AM/NS Calvert Expansion",
    alias: "ArcelorMittal Nippon Steel · Calvert",
    status: "confirmed",
    stage: ProjectStage.CONSTRUCTION,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$1.0B",
    facilityType: "EAF steel · slab caster",
    parishCounty: "Mobile",
    state: "AL",
    corridor: "Mobile / Baldwin / AL",
    centerLat: 31.1234,
    centerLng: -87.9123,
    totalAcres: 1400,
    buyers: ["AM/NS Calvert"],
    firstSignalAt: "2022-05-12",
    publicAnnouncedAt: "2022-09-14",
    signals: [
      { family: SignalFamily.LAND_CONTROL,    predicate: "land.expansion",      subjectLabel: "Calvert site expansion",      observedAt: "2022-05-12", weight: 25, confidence: 0.93, sourceSlug: "ascension-assessor" },
      { family: SignalFamily.PUBLIC_COMPANY,  predicate: "sec.filing.20-F",     subjectLabel: "AM/NS capex disclosure",      observedAt: "2022-09-14", weight: 7,  confidence: 0.99, sourceSlug: "sec-edgar" },
    ],
  },

  // ── 10 · Major transmission / generation · Stargate / Entergy MISO
  {
    publicId: "PRJ-2024-01009",
    name: "Entergy Mississippi River Transmission Backbone",
    alias: "MISO South · industrial-load buildout",
    status: "confirmed",
    stage: ProjectStage.CONSTRUCTION,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$2.4B",
    facilityType: "Transmission · 230kV/500kV",
    parishCounty: "Multiple · LA",
    state: "LA",
    corridor: "Ascension / River corridor",
    centerLat: 30.4515,
    centerLng: -91.1871,
    totalAcres: 0,
    buyers: ["Entergy Louisiana", "MISO"],
    firstSignalAt: "2022-09-30",
    publicAnnouncedAt: "2023-06-22",
    signals: [
      { family: SignalFamily.UTILITY_POWER,   predicate: "utility.transmission.plan", subjectLabel: "MISO LRTP · Tranche 2",  observedAt: "2022-09-30", weight: 15, confidence: 0.95, sourceSlug: "lpsc" },
      { family: SignalFamily.UTILITY_POWER,   predicate: "utility.irp",              subjectLabel: "Entergy IRP filing",      observedAt: "2023-06-22", weight: 15, confidence: 0.95, sourceSlug: "lpsc" },
    ],
  },

  // ── 11 · Port terminal / dredging · Port of South Louisiana
  {
    publicId: "PRJ-2024-01010",
    name: "Port of South Louisiana · Lower Mississippi Dredging",
    alias: "PSL · 50-foot deepening · St. John assembly",
    status: "confirmed",
    stage: ProjectStage.CONSTRUCTION,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$0.5B",
    facilityType: "Port · navigation channel · terminal expansion",
    parishCounty: "St. John the Baptist",
    state: "LA",
    corridor: "St. James / St. John",
    centerLat: 30.0563,
    centerLng: -90.6712,
    totalAcres: 220,
    buyers: ["Port of South Louisiana", "USACE"],
    firstSignalAt: "2020-02-10",
    publicAnnouncedAt: "2021-05-15",
    signals: [
      { family: SignalFamily.PORT_TERMINAL,         predicate: "port.dredging",   subjectLabel: "PSL dredging contract",     observedAt: "2020-02-10", weight: 8, confidence: 0.94, sourceSlug: "la-bond-commission" },
      { family: SignalFamily.ENVIRONMENTAL_PERMIT,  predicate: "permit.408",      subjectLabel: "USACE Section 408 notice",  observedAt: "2020-08-22", weight: 15, confidence: 0.97, sourceSlug: "usace-mvn" },
      { family: SignalFamily.PROCUREMENT,           predicate: "procurement.federal", subjectLabel: "SAM.gov dredging award", observedAt: "2021-04-06", weight: 5, confidence: 0.96, sourceSlug: "sam-gov" },
    ],
  },
];
