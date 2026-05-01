import { describe, it, expect, afterEach, vi } from "vitest";
import { fakeContext } from "./helpers/adapterContext";
import { emmaMsrbAdapter } from "../src/emma-msrb";

describe("emma-msrb adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses RSS XML and emits FINANCING signals for IDB-relevant items", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const fixture = await readFile(
      resolve(__dirname, "fixtures", "emma-msrb-feed.xml"),
      "utf8",
    );
    // The adapter iterates 4 state feeds; return the fixture for every call.
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(fixture, { status: 200, headers: { "content-type": "application/rss+xml" } }),
    ));

    const result = await emmaMsrbAdapter.run(fakeContext("emma-msrb"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("FINANCING");
    expect(r.predicate).toBe("financing.bond.disclosure");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("filters out non-IDB items (title/description lacks IDB hints)", async () => {
    const nonIdbXml = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>City of New Orleans — General Obligation Bond</title>
    <link>https://emma.msrb.org/disc/999</link>
    <description>General obligation bond for city infrastructure. Not IDB-related.</description>
    <guid>https://emma.msrb.org/disc/999</guid>
    <pubDate>Mon, 13 Apr 2026 09:00:00 GMT</pubDate>
  </item>
</channel></rss>`;
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(nonIdbXml, { status: 200, headers: { "content-type": "application/rss+xml" } }),
    ));
    const result = await emmaMsrbAdapter.run(fakeContext("emma-msrb"));
    expect(result.records.length).toBe(0);
  });

  it("gracefully returns 0 records if all feeds return 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("Network error");
    }));
    const result = await emmaMsrbAdapter.run(fakeContext("emma-msrb"));
    expect(result.records.length).toBe(0);
    expect(result.notes).toMatch(/EMMA:/);
  });

  it("has slug emma-msrb and implemented:true", () => {
    expect(emmaMsrbAdapter.slug).toBe("emma-msrb");
    expect(emmaMsrbAdapter.implemented).toBe(true);
    expect(emmaMsrbAdapter.family).toBe("FINANCING");
  });
});
