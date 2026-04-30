/**
 * Seed-data barrel — re-exports all fixture modules.
 *
 * Split from a single 33KB seed.ts to keep each commit under tool-call
 * size limits. The split also makes individual fixtures cheap to amend
 * (e.g. updating just the Aurora signals doesn't touch the backtest set).
 */

export { sources, type SourceSeed } from "./sources";
export { type ProjectFixture } from "./types";
export { auroraProject } from "./projects-aurora";
export { validationProjectsPart1 } from "./projects-validation-1";
export { validationProjectsPart2 } from "./projects-validation-2";

import { auroraProject } from "./projects-aurora";
import { validationProjectsPart1 } from "./projects-validation-1";
import { validationProjectsPart2 } from "./projects-validation-2";

/** All fixtures in canonical order: Aurora first (today), then backtest 2-11. */
export const projects = [
  auroraProject,
  ...validationProjectsPart1,
  ...validationProjectsPart2,
];
