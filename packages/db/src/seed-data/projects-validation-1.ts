/**
 * Backtest projects part 1 — validation fixtures 2-5.
 *
 * Public projects from knowledge/validation/validation-plan.md:
 *   #2 Hyundai Steel Donaldsonville (Ascension, $5.8B, public 2024)
 *   #3 Woodside Louisiana LNG (Calcasieu, $16B, FID 2024)
 *   #4 Meta Richland Data Center (Richland, $10B, public 2024)
 *   #5 Louisiana International Terminal (Plaquemines, $1.8B, EPC)
 */

import {
  Confidence,
  ProjectStage,
  SignalFamily,
} from "../index";
import type { ProjectFixture } from "./types";

export const validationProjectsPart1: ProjectFixture[] = [

  // ── 2 · Hyundai Steel Donaldsonville (validation backtest, public 2024)
  {
    publicId: "PRJ-2024-01001",
    name: "Hyundai Steel Donaldsonville",
    alias: "Hyundai Steel · Ascension",
    status: "confirmed",
    stage: ProjectStage.PUBLIC_ANNOUNCED,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$5.8B",
    estimatedJobs: 1300,
    facilityType: "Integrated steel mill",
    parishCounty: "Ascension",
    state: "LA",
    corridor: "Ascension / River corridor",
    centerLat: 30.0856,
    centerLng: -91.0123,
    totalAcres: 1700,
    buyers: ["HD Steel Louisiana LLC"],
    firstSignalAt: "2023-11-02",
    publicAnnouncedAt: "2024-03-22",
    signals: [
      { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer.bulk",   subjectLabel: "Donaldsonville assembly · 1,700 ac", observedAt: "2023-11-02", weight: 25, confidence: 0.97, sourceSlug: "ascension-assessor" },
      { family: SignalFamily.ENTITY_FORMATION,predicate: "entity.formed",        subjectLabel: "HD Steel Louisiana LLC",            observedAt: "2023-12-08", weight: 10, confidence: 0.99, sourceSlug: "la-sos" },
      { family: SignalFamily.UTILITY_POWER,   predicate: "utility.interconnection", subjectLabel: "Entergy LA · large industrial load", observedAt: "2024-01-12", weight: 15, confidence: 0.92, sourceSlug: "lpsc" },
      { family: SignalFamily.INCENTIVE,       predicate: "incentive.itep.approved", subjectLabel: "ITEP / Mega Project incentive", observedAt: "2024-02-06", weight: 15, confidence: 0.95, sourceSlug: "la-bd-ci" },
      { family: SignalFamily.ENVIRONMENTAL_PERMIT, predicate: "permit.air.NOI",  subjectLabel: "LDEQ air NOI · steel facility",     observedAt: "2024-02-18", weight: 15, confidence: 0.96, sourceSlug: "ldeq-edms" },
    ],
  },

  // ── 3 · Woodside Louisiana LNG
  {
    publicId: "PRJ-2024-01002",
    name: "Woodside Louisiana LNG",
    alias: "Driftwood LNG (legacy Tellurian)",
    status: "confirmed",
    stage: ProjectStage.FID,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$16B",
    facilityType: "LNG export terminal",
    parishCounty: "Calcasieu",
    state: "LA",
    corridor: "Calcasieu / Cameron",
    centerLat: 30.1452,
    centerLng: -93.3334,
    totalAcres: 1000,
    buyers: ["Driftwood LNG LLC", "Woodside Energy Group"],
    firstSignalAt: "2018-05-04",
    publicAnnouncedAt: "2019-04-09",
    signals: [
      { family: SignalFamily.UTILITY_POWER,   predicate: "ferc.docket",          subjectLabel: "FERC docket CP17-117",           observedAt: "2018-05-04", weight: 15, confidence: 0.99, sourceSlug: "ferc-elibrary" },
      { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer.bulk",   subjectLabel: "Calcasieu River parcel assembly", observedAt: "2018-08-21", weight: 25, confidence: 0.94, sourceSlug: "calcasieu-assessor" },
      { family: SignalFamily.ENVIRONMENTAL_PERMIT, predicate: "permit.404",      subjectLabel: "USACE Section 404 notice",       observedAt: "2018-11-15", weight: 15, confidence: 0.96, sourceSlug: "usace-mvn" },
      { family: SignalFamily.PUBLIC_COMPANY,  predicate: "sec.filing.10-K",      subjectLabel: "Woodside FID disclosure",         observedAt: "2024-07-15", weight: 7, confidence: 0.99, sourceSlug: "sec-edgar" },
    ],
  },

  // ── 4 · Meta / Entergy Richland Parish data center
  {
    publicId: "PRJ-2024-01003",
    name: "Meta Richland Data Center",
    alias: "Entergy Richland — large industrial load",
    status: "confirmed",
    stage: ProjectStage.PUBLIC_ANNOUNCED,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$10B",
    estimatedJobs: 500,
    facilityType: "Hyperscale data center",
    parishCounty: "Richland",
    state: "LA",
    corridor: "Northeast LA / I-20",
    centerLat: 32.4612,
    centerLng: -91.4934,
    totalAcres: 2250,
    buyers: ["Mid-South Cooling LLC", "Meta Platforms Inc"],
    firstSignalAt: "2024-04-18",
    publicAnnouncedAt: "2024-12-04",
    signals: [
      { family: SignalFamily.LAND_CONTROL,    predicate: "land.transfer.bulk",       subjectLabel: "Delhi · 2,250 ac assemblage",      observedAt: "2024-04-18", weight: 25, confidence: 0.92, sourceSlug: "ebr-gis" },
      { family: SignalFamily.UTILITY_POWER,   predicate: "utility.interconnection",  subjectLabel: "Entergy · 2 GW interconnection",   observedAt: "2024-08-30", weight: 15, confidence: 0.97, sourceSlug: "lpsc" },
      { family: SignalFamily.UTILITY_POWER,   predicate: "utility.generation.gas",   subjectLabel: "Entergy gas-fired generation plan", observedAt: "2024-10-12", weight: 15, confidence: 0.93, sourceSlug: "lpsc" },
    ],
  },

  // ── 5 · Louisiana International Terminal
  {
    publicId: "PRJ-2024-01004",
    name: "Louisiana International Terminal",
    alias: "LIT · Plaquemines",
    status: "confirmed",
    stage: ProjectStage.EPC,
    confidence: Confidence.HIGH,
    score: 100,
    estimatedCapex: "$1.8B",
    facilityType: "Container terminal",
    parishCounty: "Plaquemines",
    state: "LA",
    corridor: "Plaquemines / Lower Miss",
    centerLat: 29.4521,
    centerLng: -89.7012,
    totalAcres: 1100,
    buyers: ["Port of New Orleans"],
    firstSignalAt: "2022-04-14",
    publicAnnouncedAt: "2022-09-20",
    signals: [
      { family: SignalFamily.PORT_TERMINAL,        predicate: "port.lease.option", subjectLabel: "Port NOLA · Violet site option",   observedAt: "2022-04-14", weight: 8,  confidence: 0.95, sourceSlug: "la-bond-commission" },
      { family: SignalFamily.ENVIRONMENTAL_PERMIT, predicate: "permit.404",       subjectLabel: "USACE 404 notice · LIT",            observedAt: "2022-12-08", weight: 15, confidence: 0.96, sourceSlug: "usace-mvn" },
      { family: SignalFamily.FINANCING,            predicate: "financing.bond.idb",subjectLabel: "Bond Commission · IDB authorization",observedAt: "2023-03-15", weight: 7, confidence: 0.94, sourceSlug: "la-bond-commission" },
    ],
  },
];
