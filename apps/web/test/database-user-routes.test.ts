import { beforeEach, describe, expect, it, vi } from "vitest";

const requireDatabaseUserMock = vi.fn();
const projectFindUniqueMock = vi.fn();
const watchlistFindFirstMock = vi.fn();
const watchlistFindUniqueMock = vi.fn();
const watchlistCreateMock = vi.fn();
const watchlistUpdateMock = vi.fn();
const setReviewStateMock = vi.fn();

vi.mock("../app/api/_lib/require-user", () => ({
  requireDatabaseUser: requireDatabaseUserMock,
}));

vi.mock("@gcir/db", () => {
  return {
    AnalystState: {
      WATCH: "WATCH",
      ESCALATED: "ESCALATED",
      VALID: "VALID",
      FALSE_POSITIVE: "FALSE_POSITIVE",
      DISMISSED: "DISMISSED",
    },
    prisma: {
      project: { findUnique: (...args: unknown[]) => projectFindUniqueMock(...args) },
      watchlist: {
        findFirst: (...args: unknown[]) => watchlistFindFirstMock(...args),
        findUnique: (...args: unknown[]) => watchlistFindUniqueMock(...args),
        create: (...args: unknown[]) => watchlistCreateMock(...args),
        update: (...args: unknown[]) => watchlistUpdateMock(...args),
      },
    },
  };
});

vi.mock("@gcir/agents", () => ({ setReviewState: setReviewStateMock }));

describe("database-backed identity routes", () => {
  beforeEach(() => {
    requireDatabaseUserMock.mockReset();
    projectFindUniqueMock.mockReset();
    watchlistFindFirstMock.mockReset();
    watchlistFindUniqueMock.mockReset();
    watchlistCreateMock.mockReset();
    watchlistUpdateMock.mockReset();
    setReviewStateMock.mockReset();
    requireDatabaseUserMock.mockResolvedValue({
      ok: true,
      clerkUserId: "user_clerk",
      databaseUserId: "user_database",
      role: "analyst",
    });
  });

  it("stores watchlist ownership with the local database user id", async () => {
    projectFindUniqueMock.mockResolvedValue({
      id: "project-1",
      publicId: "PRJ-1",
      name: "Project One",
      stage: "WATCH",
      score: 70,
      parishCounty: "Ascension",
      state: "LA",
      facilityType: "manufacturing",
    });
    watchlistFindFirstMock.mockResolvedValue(null);
    watchlistCreateMock.mockResolvedValue({ id: "watchlist-1" });

    const { POST } = await import("../app/api/watchlists/route");
    const response = await POST(new Request("http://localhost/api/watchlists", {
      method: "POST",
      body: JSON.stringify({ projectId: "project-1" }),
    }));

    expect(response.status).toBe(200);
    expect(watchlistCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: "user_database" }),
    }));
  });

  it("compares watchlist ownership to the local database user id", async () => {
    watchlistFindUniqueMock.mockResolvedValue({
      id: "watchlist-1",
      filter: {},
      userId: "user_database",
    });
    watchlistUpdateMock.mockResolvedValue({ id: "watchlist-1" });

    const { PATCH } = await import("../app/api/watchlists/[id]/route");
    const response = await PATCH(new Request("http://localhost/api/watchlists/watchlist-1", {
      method: "PATCH",
      body: JSON.stringify({ followed: true }),
    }), { params: Promise.resolve({ id: "watchlist-1" }) });

    expect(response.status).toBe(200);
    expect(watchlistUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("persists analyst reviews with the local database user id", async () => {
    const { POST } = await import("../app/api/projects/[id]/review/route");
    const response = await POST(new Request("http://localhost/api/projects/project-1/review", {
      method: "POST",
      body: JSON.stringify({ state: "WATCH", note: "Monitor the next agenda." }),
    }), { params: Promise.resolve({ id: "project-1" }) });

    expect(response.status).toBe(200);
    expect(setReviewStateMock).toHaveBeenCalledWith(
      "project-1",
      "WATCH",
      "user_database",
      "Monitor the next agenda.",
    );
  });
});
