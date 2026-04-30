/**
 * Factory for minimal AdapterContext objects used in tests.
 */
import type { AdapterContext } from "../../src/types";

export function makeContext(overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    parish: "East Baton Rouge",
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    ...overrides,
  };
}
