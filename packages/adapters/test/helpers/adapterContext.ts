/**
 * Builds a minimal fake AdapterContext for unit tests.
 */
import type { AdapterContext } from "../../src/types";

export function fakeContext(sourceSlug: string, overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    sourceId: `src-test-${sourceSlug}`,
    sourceRunId: `run-test-${sourceSlug}-001`,
    cursor: undefined,
    since: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  };
}
