import { describe, it, expect, afterEach, vi } from "vitest";
import { fakeContext } from "./helpers/adapterContext";
import { emmaMsrbAdapter } from "../src/emma-msrb";

describe("emma-msrb adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns empty records under free-data constraint", async () => {
    const result = await emmaMsrbAdapter.run(fakeContext("emma-msrb"));
    expect(result.records.length).toBe(0);
    expect(result.notes).toMatch(/no public RSS\/JSON/i);
  });

  it("notes mention LA Bond Commission fallback", async () => {
    const result = await emmaMsrbAdapter.run(fakeContext("emma-msrb"));
    expect(result.notes).toMatch(/Bond Commission/i);
  });

  it("has slug emma-msrb and implemented:false", () => {
    expect(emmaMsrbAdapter.slug).toBe("emma-msrb");
    expect(emmaMsrbAdapter.implemented).toBe(false);
    expect(emmaMsrbAdapter.family).toBe("FINANCING");
  });
});
