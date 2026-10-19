import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindUniqueMock = vi.fn();
const alertFindFirstMock = vi.fn();

vi.mock("@gcir/db", () => ({
  prisma: {
    project: { findUnique: (...args: unknown[]) => projectFindUniqueMock(...args) },
    alert: { findFirst: (...args: unknown[]) => alertFindFirstMock(...args) },
  },
}));

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    projectFindUniqueMock.mockReset();
    alertFindFirstMock.mockReset();
    projectFindUniqueMock.mockResolvedValue({
      id: "project-1",
      publicId: "PRJ-1",
      name: "Project One",
      stage: "WATCH",
      score: 85,
      scoreBreakdown: {},
      parishCounty: "Ascension",
      state: "LA",
      facilityType: null,
      estimatedCapex: null,
      estimatedJobs: null,
      firstSignalAt: null,
      publicAnnouncedAt: null,
      sites: [],
      status: "suspected",
      _count: { signals: 1, actions: 2, milestones: 3 },
    });
    alertFindFirstMock.mockResolvedValue(null);
  });

  it("returns an unknown score delta when no immutable score history exists", async () => {
    const { GET } = await import("../app/api/projects/[id]/route");
    const response = await GET(new Request("http://localhost/api/projects/project-1"), {
      params: Promise.resolve({ id: "project-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scoreDelta).toBeNull();
    expect(alertFindFirstMock).toHaveBeenCalledTimes(1);
  });
});
