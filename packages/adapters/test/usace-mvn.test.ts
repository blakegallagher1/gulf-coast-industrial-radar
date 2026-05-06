import { describe, it, expect, afterEach, vi } from "vitest";
import { mockFetchOnce } from "./helpers/mockFetch";
import { fakeContext } from "./helpers/adapterContext";
import { usaceMvnAdapter } from "../src/usace-mvn";

describe("usace-mvn adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses HTML notices into ENVIRONMENTAL_PERMIT signals", async () => {
    mockFetchOnce("usace-mvn-notices.html", "text/html");
    const result = await usaceMvnAdapter.run(fakeContext("usace-mvn"));
    expect(result.records.length).toBeGreaterThan(0);
    const r = result.records[0];
    expect(r.family).toBe("ENVIRONMENTAL_PERMIT");
    expect(r.predicate).toMatch(/^permit\./);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("assigns section-specific predicate when title includes section 404", async () => {
    mockNoticeTitle("Section 404 wetlands fill — Ascension Industrial Canal Expansion");
    const result = await usaceMvnAdapter.run(fakeContext("usace-mvn"));
    const s404 = result.records.find((r) => r.subjectLabel.toLowerCase().includes("404"));
    expect(s404).toBeDefined();
    expect(s404!.predicate).toBe("permit.wetlands.404");
  });

  it("assigns section-specific predicate when title includes section 10", async () => {
    mockNoticeTitle("Section 10 navigation channel — Port of Plaquemine deepening");
    const result = await usaceMvnAdapter.run(fakeContext("usace-mvn"));
    const s10 = result.records.find((r) => r.subjectLabel.toLowerCase().includes("section 10"));
    expect(s10).toBeDefined();
    expect(s10!.predicate).toBe("permit.section10");
  });

  it("assigns section-specific predicate when title includes section 408", async () => {
    mockNoticeTitle("Section 408 alteration of federal levee — Calcasieu Ship Channel buffer");
    const result = await usaceMvnAdapter.run(fakeContext("usace-mvn"));
    const s408 = result.records.find((r) => r.subjectLabel.toLowerCase().includes("408"));
    expect(s408).toBeDefined();
    expect(s408!.predicate).toBe("permit.section408");
  });

  it("url field is the PDF link (absolute)", async () => {
    mockFetchOnce("usace-mvn-notices.html", "text/html");
    const result = await usaceMvnAdapter.run(fakeContext("usace-mvn"));
    for (const r of result.records) {
      expect(r.url).toMatch(/^https?:\/\//);
      expect(r.url).toMatch(/\.pdf$/i);
    }
  });

  it("has slug usace-mvn and implemented:true", () => {
    expect(usaceMvnAdapter.slug).toBe("usace-mvn");
    expect(usaceMvnAdapter.implemented).toBe(true);
    expect(usaceMvnAdapter.family).toBe("ENVIRONMENTAL_PERMIT");
  });
});

function mockNoticeTitle(title: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        `<a href="/Portals/26/docs/regulatory/publicnotices/2026/MVN-2026-01234-PublicNotice.pdf">${title}</a>`,
        { status: 200, headers: { "content-type": "text/html" } },
      ),
    ),
  );
}
