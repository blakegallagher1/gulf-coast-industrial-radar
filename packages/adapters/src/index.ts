import type { SourceAdapter } from "./types";

import { ledFastLaneAdapter } from "./led-fastlane";
import { ldeqEdmsAdapter } from "./ldeq-edms";
import { usaceMvnAdapter } from "./usace-mvn";
import { laSosAdapter } from "./la-sos";
import { ascensionParcelAdapter } from "./parcel-ascension";
import { ebrParcelAdapter } from "./parcel-ebr";
import { calcasieuParcelAdapter } from "./parcel-calcasieu";
import { secEdgarAdapter } from "./sec-edgar";
import { lpscAdapter } from "./lpsc";
import { samGovAdapter } from "./sam-gov";
import { emmaMsrbAdapter } from "./emma-msrb";
import { tceqAdapter } from "./tceq";
import { laItepAdapter } from "./la-itep";
import { fercElibraryAdapter } from "./ferc-elibrary";
import { laBdCiAdapter } from "./la-bd-ci";
import { laBondCommissionAdapter } from "./la-bond-commission";
import { txJetiAdapter } from "./tx-jeti";

export * from "./types";
export * from "./utils/fetch-with-retry";
export * from "./utils/evidence-store";

export const adapters: Record<string, SourceAdapter> = {
  [ledFastLaneAdapter.slug]: ledFastLaneAdapter,
  [ldeqEdmsAdapter.slug]: ldeqEdmsAdapter,
  [usaceMvnAdapter.slug]: usaceMvnAdapter,
  [laSosAdapter.slug]: laSosAdapter,
  [ascensionParcelAdapter.slug]: ascensionParcelAdapter,
  [ebrParcelAdapter.slug]: ebrParcelAdapter,
  [calcasieuParcelAdapter.slug]: calcasieuParcelAdapter,
  [secEdgarAdapter.slug]: secEdgarAdapter,
  [lpscAdapter.slug]: lpscAdapter,
  [samGovAdapter.slug]: samGovAdapter,
  [emmaMsrbAdapter.slug]: emmaMsrbAdapter,
  [tceqAdapter.slug]: tceqAdapter,
  [laItepAdapter.slug]: laItepAdapter,
  [fercElibraryAdapter.slug]: fercElibraryAdapter,
  [laBdCiAdapter.slug]: laBdCiAdapter,
  [laBondCommissionAdapter.slug]: laBondCommissionAdapter,
  [txJetiAdapter.slug]: txJetiAdapter,
};

export function getAdapter(slug: string): SourceAdapter | undefined {
  return adapters[slug];
}
