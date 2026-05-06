import { describe, expect, it } from "vitest";
import { runBacktest } from "../src";

describe("runBacktest", () => {
  it("returns deterministic lead-time deltas for the seeded validation projects", () => {
    const result = runBacktest();

    expect(
      result.projects.map((project) => ({
        projectKey: project.projectKey,
        leadTimeDays: project.leadTimeDays,
        qladTriggerDate: project.qladTriggerDate,
        formationScoreAtSurface: project.formationScoreAtSurface,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "formationScoreAtSurface": 24,
          "leadTimeDays": 141,
          "projectKey": "hyundai-steel-donaldsonville",
          "qladTriggerDate": "2023-11-02",
        },
        {
          "formationScoreAtSurface": 15,
          "leadTimeDays": 340,
          "projectKey": "woodside-louisiana-lng",
          "qladTriggerDate": "2018-08-21",
        },
        {
          "formationScoreAtSurface": 23,
          "leadTimeDays": 230,
          "projectKey": "meta-richland-data-center",
          "qladTriggerDate": "2024-04-18",
        },
        {
          "formationScoreAtSurface": 8,
          "leadTimeDays": 159,
          "projectKey": "louisiana-international-terminal",
          "qladTriggerDate": null,
        },
        {
          "formationScoreAtSurface": 15,
          "leadTimeDays": 730,
          "projectKey": "lake-charles-lng-expansion-energy-transfer",
          "qladTriggerDate": null,
        },
        {
          "formationScoreAtSurface": 7,
          "leadTimeDays": 0,
          "projectKey": "air-products-blue-ammonia-ascension",
          "qladTriggerDate": null,
        },
        {
          "formationScoreAtSurface": 15,
          "leadTimeDays": 290,
          "projectKey": "rio-grande-lng-brownsville",
          "qladTriggerDate": null,
        },
        {
          "formationScoreAtSurface": 23,
          "leadTimeDays": 125,
          "projectKey": "am-ns-calvert-expansion",
          "qladTriggerDate": "2022-05-12",
        },
        {
          "formationScoreAtSurface": 14,
          "leadTimeDays": 265,
          "projectKey": "entergy-mississippi-river-transmission-backbone",
          "qladTriggerDate": null,
        },
        {
          "formationScoreAtSurface": 8,
          "leadTimeDays": 460,
          "projectKey": "port-of-south-louisiana-lower-mississippi-dredging",
          "qladTriggerDate": null,
        },
      ]
    `);
    expect(result.metrics).toMatchObject({
      projectCount: 10,
      alertedAheadCount: 9,
      precision: 0.9,
      recall: 0.9,
    });
  });
});
