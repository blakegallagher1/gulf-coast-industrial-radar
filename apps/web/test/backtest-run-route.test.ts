import { describe, expect, it, vi } from "vitest";

const createMock = vi.fn(async () => ({
  id: "backtest-run-test",
  completedAt: new Date("2026-05-06T12:00:00.000Z"),
}));

vi.mock("@gcir/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@gcir/db")>();
  return {
    ...actual,
    prisma: {
      ...actual.prisma,
      backtestRun: {
        create: createMock,
      },
    },
  };
});

describe("POST /api/backtest/run", () => {
  it("returns shape-stable JSON and persists the computed backtest", async () => {
    const { POST } = await import("../app/api/backtest/run/route");

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      runId: "backtest-run-test",
      completedAt: "2026-05-06T12:00:00.000Z",
      result: {
        metrics: {
          projectCount: 10,
          alertedAheadCount: 9,
          precision: 0.9,
          recall: 0.9,
        },
      },
    });
    expect(body.result.projects).toHaveLength(10);
    expect(body.result.projects[0]).toEqual(
      expect.objectContaining({
        projectKey: "hyundai-steel-donaldsonville",
        publicAnnouncementDate: "2024-03-22",
        earliestSurfacedAt: "2023-11-02",
        timeline: expect.any(Array),
      }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectCount: 10,
          alertedAheadCount: 9,
          precision: 0.9,
          recall: 0.9,
        }),
      }),
    );
  });
});
