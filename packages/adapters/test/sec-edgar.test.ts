import { describe, it, expect, afterEach, vi } from "vitest";
import { fakeContext } from "./helpers/adapterContext";
import { secEdgarAdapter } from "../src/sec-edgar";

describe("sec-edgar adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches EDGAR submissions and emits PUBLIC_COMPANY signals for known forms", async () => {
    // SEC EDGAR adapter iterates the WATCH list and makes one request per CIK.
    // We stub fetch to return the fixture for any URL.
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "sec-edgar-submissions.json"),
      "utf8",
    );
    const stub = vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", stub);

    const result = await secEdgarAdapter.run(fakeContext("sec-edgar"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("PUBLIC_COMPANY");
    expect(r.predicate).toMatch(/^sec\.filing\./);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("predicate includes form type (8-K, 10-Q)", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "sec-edgar-submissions.json"),
      "utf8",
    );
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "application/json" } }),
    ));

    const result = await secEdgarAdapter.run(fakeContext("sec-edgar"));
    const forms = result.records.map((r) => r.predicate);
    expect(forms.some((p) => p.includes("8-K"))).toBe(true);
    expect(forms.some((p) => p.includes("10-Q"))).toBe(true);
  });

  it("includes requiresFullTextScan and parishKeywords in payload", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "sec-edgar-submissions.json"),
      "utf8",
    );
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "application/json" } }),
    ));

    const result = await secEdgarAdapter.run(fakeContext("sec-edgar"));
    expect(result.records[0].payload.requiresFullTextScan).toBe(true);
    expect(Array.isArray(result.records[0].payload.parishKeywords)).toBe(true);
  });

  it("has slug sec-edgar and implemented:true", () => {
    expect(secEdgarAdapter.slug).toBe("sec-edgar");
    expect(secEdgarAdapter.implemented).toBe(true);
    expect(secEdgarAdapter.family).toBe("PUBLIC_COMPANY");
  });
});
