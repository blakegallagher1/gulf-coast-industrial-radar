/**
 * Seed: 10 backtest projects from knowledge/validation/validation-plan.md
 * + Aurora Steel Donaldsonville as a fresh "today" formation case.
 *
 * Seeds Sources, Projects, Signals, Entities, Parcels, ParcelInterests,
 * RecommendedActions, ProjectMilestones, and an example weekly Brief.
 *
 * Run:  pnpm db:seed
 */

import {
  prisma,
  Prisma,
  ProjectStage,
  Confidence,
  SignalFamily,
  EntityKind,
  ParcelInterestKind,
  ActionKind,
  AccessMethod,
  SourceCadence,
  SourceStatus,
} from "./index";

// ─────────────────────────────────────────────────────────────────────────────
//  SOURCES
// ─────────────────────────────────────────────────────────────────────────────

const sources = [
  {
    slug: "led-fastlane",
    name: "LED FastLane / IMS",
    jurisdiction: "Louisiana · LED",
    state: "LA",
    family: SignalFamily.INCENTIVE,
    url: "https://opportunitylouisiana.gov",
    cadence: SourceCadence.DAILY,
    accessMethod: AccessMethod.HTTP_API,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "la-itep",
    name: "Louisiana ITEP",
    jurisdiction: "Louisiana · LED",
    state: "LA",
    family: SignalFamily.INCENTIVE,
    url: "https://opportunitylouisiana.gov",
    cadence: SourceCadence.WEEKLY,
    accessMethod: AccessMethod.HTTP_API,
    status: SourceStatus.ACTIVE,
  },
  {
    slug: "ebr-gis",
    name: "EBR Parish GIS - Parcels",
    jurisdiction: "East Baton Rouge Parish",
    state: "LA",
    family: SignalFamily.PARCEL,
    url: "https://maps.brla.gov/arcgis/rest/services/Cadastral/Tax_Parcel/MapServer",
    cadence: SourceCadence.WEEKLY,
    accessMethod: AccessMethod.ARCGIS_REST,$�PЀL@�`�=D� �