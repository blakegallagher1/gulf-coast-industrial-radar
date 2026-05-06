import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserMock = vi.fn();
const tickQladMock = vi.fn();

vi.mock("../app/api/_lib/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("../../worker/src/jobs/qlad-evaluate", () => ({
  tickQlad: tickQladMock,
}));

describe("POST /api/qlad/run", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    tickQladMock.mockReset();
  });

  it("returns unauthorized when no authenticated user is present", async () => {
    requireUserMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    });

    const { POST } = await import("../app/api/qlad/run/route");
    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("runs QLAD for authenticated operators", async () => {
    requireUserMock.mockResolvedValue({ ok: true, userId: "user_123" });
    tickQladMock.mockResolvedValue({
      signalsConsidered: 12,
      clustersBuilt: 3,
      clustersTriggered: 1,
      alertsCreated: 1,
      alertsSilenced: 0,
      totalValidationUsd: 0,
      ownerConcentrationCandidates: 1,
      rejectionSummary: [],
    });

    const { POST } = await import("../app/api/qlad/run/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      result: {
        signalsConsidered: 12,
        clustersTriggered: 1,
        alertsCreated: 1,
      },
    });
    expect(tickQladMock).toHaveBeenCalledTimes(1);
  });
});
