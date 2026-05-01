import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { tceqAdapter } from "../src/tceq";

describe("tceq adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses TCEQ pending HTML into ENVIRONMENTAL_PERMIT signals", async () => {
    // The updated adapter fetches TWO URLs (NSR + Title V); stub both calls
    // with the same fixture.
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "tceq-pending.html"),
      "utf8",
    );
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "text/html" } }),
    ));

    const result = await tceqAdapter.run(fakeContext("tceq"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("ENVIRONMENTAL_PERMIT");
    expect(r.predicate).toBe("permit.tceq.air");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("filters out alphabetical-index anchor rows and Back-to-top rows", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "tceq-pending.html"),
      "utf8",
    );
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "text/html" } }),
    ));

    const result = await tceqAdapter.run(fakeContext("tceq"));
    // No externalId should be "tceq:NSR:A" or contain "back to top"
    for (const r of result.records) {
      expect(r.subjectLabel.toLowerCase()).not.toMatch(/^back\s+to\s+top/);
      expect(r.externalId).not.toMatch(/:A$/);
    }
  });

  it("extracts applicant and permit number from confirmed column layout", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "tceq-pending.html"),
      "utf8",
    );
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "text/html" } }),
    ));

    const result = await tceqAdapter.run(fakeContext("tceq"));
    const acacia = result.records.find((r) =>
      r.subjectLabel.toLowerCase().includes("acacia"),
    );
    expect(acacia).toBeDefined();
    expect(acacia!.externalId).toMatch(/3860/);
  });

  it("has slug tceq and implemented:true", () => {
    expect(tceqAdapter.slug).toBe("tceq");
    expect(tceqAdapter.implemented).toBe(true);
    expect(tceqAdapter.family).toBe("ENVIRONMENTAL_PERMIT");
  });
});
