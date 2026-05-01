import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { laSosAdapter } from "../src/la-sos";

describe("la-sos adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses SOS search HTML into ENTITY_FORMATION signals", async () => {
    // La SOS makes two requests: GET (cookie seed) then POST (search).
    // We stub fetch to return the same fixture for both calls.
    const stub = vi.fn(async () => {
      const { readFile } = await import("node:fs/promises");
      const { resolve } = await import("node:path");
      const body = await readFile(
        resolve(__dirname, "fixtures", "la-sos-search.html"),
        "utf8",
      );
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/html", "set-cookie": "ASP.NET_SessionId=test123" },
      });
    });
    vi.stubGlobal("fetch", stub);

    const result = await laSosAdapter.run(fakeContext("la-sos"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("ENTITY_FORMATION");
    expect(r.predicate).toMatch(/^entity\.formed/);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("marks opaque entities with entity.formed.opaque predicate", async () => {
    const stub = vi.fn(async () => {
      const { readFile } = await import("node:fs/promises");
      const { resolve } = await import("node:path");
      const body = await readFile(
        resolve(__dirname, "fixtures", "la-sos-search.html"),
        "utf8",
      );
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/html", "set-cookie": "ASP.NET_SessionId=test123" },
      });
    });
    vi.stubGlobal("fetch", stub);

    const result = await laSosAdapter.run(fakeContext("la-sos"));
    // "CRESCENT INDUSTRIAL HOLDINGS IV LLC" has "holdings" → opaque
    const opaque = result.records.find((r) =>
      r.subjectLabel.toLowerCase().includes("crescent industrial"),
    );
    expect(opaque).toBeDefined();
    expect(opaque!.predicate).toBe("entity.formed.opaque");
  });

  it("has slug la-sos and implemented:true", () => {
    expect(laSosAdapter.slug).toBe("la-sos");
    expect(laSosAdapter.implemented).toBe(true);
    expect(laSosAdapter.family).toBe("ENTITY_FORMATION");
  });
});
