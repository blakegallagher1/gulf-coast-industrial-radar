import { describe, expect, it } from "vitest";
import { buildRadarProjects, resolveInitialRadarProjectId } from "../lib/radar-projects";

const base = {
  publicId: "PRJ-1",
  name: "Project One",
  stage: "WATCH",
  score: 70,
  parishCounty: "Ascension",
  state: "LA",
  corridor: "",
  facilityType: null,
  firstSignalAt: null,
  estimatedCapex: null,
};

describe("radar requested project inclusion", () => {
  it("includes an explicitly requested project that is outside the feed and has no coordinates", () => {
    const projects = buildRadarProjects(
      [{ ...base, id: "feed", sites: [{ centerLat: 30.1, centerLng: -91.0, totalAcres: 100 }] }],
      { ...base, id: "requested", status: "confirmed", sites: [] },
    );

    expect(projects.map((project) => project.id)).toEqual(["feed", "requested"]);
    expect(projects[1]).toMatchObject({ id: "requested", lat: null, lng: null });
    expect(resolveInitialRadarProjectId(projects, "requested")).toBe("requested");
  });
});
