import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUserMock = vi.fn();
const sendEmailMock = vi.fn();
const watchlistFindManyMock = vi.fn();
const briefFindUniqueMock = vi.fn();
const briefUpdateMock = vi.fn();
const recipientFindManyMock = vi.fn();
const recipientCreateMock = vi.fn();
const recipientUpdateManyMock = vi.fn();
const transactionMock = vi.fn(async (operations: unknown[]) => Promise.all(operations));

vi.mock("../app/api/_lib/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/brief-email", () => ({
  renderBriefEmail: vi.fn(() => ({ subject: "[GCIR] Test brief", html: "<p>Brief</p>" })),
}));

vi.mock("@gcir/db", () => ({
  prisma: {
    watchlist: {
      findMany: (...args: unknown[]) => watchlistFindManyMock(...args),
    },
    brief: {
      findUnique: (...args: unknown[]) => briefFindUniqueMock(...args),
      update: (...args: unknown[]) => briefUpdateMock(...args),
    },
    briefRecipient: {
      findMany: (...args: unknown[]) => recipientFindManyMock(...args),
      create: (...args: unknown[]) => recipientCreateMock(...args),
      updateMany: (...args: unknown[]) => recipientUpdateManyMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

describe("POST /api/briefs/[id]/publish", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    sendEmailMock.mockReset();
    watchlistFindManyMock.mockReset();
    briefFindUniqueMock.mockReset();
    briefUpdateMock.mockReset();
    recipientFindManyMock.mockReset();
    recipientCreateMock.mockReset();
    recipientUpdateManyMock.mockReset();
    transactionMock.mockClear();

    requireUserMock.mockResolvedValue({ ok: true, userId: "user_123" });
    sendEmailMock.mockResolvedValue(true);
    watchlistFindManyMock.mockResolvedValue([
      { user: { email: "Investor@GPC.com" } },
      { user: { email: "investor@gpc.com" } },
      { user: { email: "developer@gpc.com" } },
    ]);
    recipientFindManyMock.mockResolvedValue([]);
    recipientCreateMock.mockResolvedValue({ id: "recipient-1" });
    recipientUpdateManyMock.mockResolvedValue({ count: 1 });
    briefUpdateMock.mockResolvedValue({ id: "brief-1" });
    briefFindUniqueMock
      .mockResolvedValueOnce({
        id: "brief-1",
        publishedAt: null,
        sourceHealth: {
          items: [],
          followedWatchlists: [{ id: "wl-1", name: "Quiet Assembly Focus" }],
          watchlistFocus: [{ projectPublicId: "PRJ-2026-08114", projectName: "Aurora Steel" }],
        },
      })
      .mockResolvedValueOnce({
        title: "Quiet assembly brief",
        narrative: "Aurora Steel moved this week.",
        topMovers: [{ name: "Aurora Steel", delta: 11 }],
      });
  });

  it("queues followed-watchlist recipients and persists publish attribution", async () => {
    const { POST } = await import("../app/api/briefs/[id]/publish/route");

    const response = await POST(
      new Request("http://localhost/api/briefs/brief-1/publish", {
        method: "POST",
        body: JSON.stringify({ emails: ["manual@gpc.com"] }),
      }),
      { params: Promise.resolve({ id: "brief-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      queuedRecipients: 3,
      followedWatchlistRecipients: 2,
    });
    expect(recipientCreateMock).toHaveBeenCalledTimes(3);
    expect(briefUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "brief-1" },
        data: expect.objectContaining({
          sourceHealth: expect.objectContaining({
            followedWatchlistDelivery: expect.objectContaining({
              recipientCount: 2,
              queuedRecipients: 3,
              watchlistCount: 1,
            }),
          }),
        }),
      }),
    );
  });

  it("dedupes manual, followed, and existing recipients case-insensitively", async () => {
    const { POST } = await import("../app/api/briefs/[id]/publish/route");

    recipientFindManyMock.mockResolvedValueOnce([
      { email: "Manual@GPC.com" },
      { email: "DEVELOPER@gpc.com" },
    ]);

    const response = await POST(
      new Request("http://localhost/api/briefs/brief-1/publish", {
        method: "POST",
        body: JSON.stringify({
          emails: [
            "manual@gpc.com",
            "Manual@GPC.com",
            "investor@gpc.com",
            "not-an-email",
          ],
        }),
      }),
      { params: Promise.resolve({ id: "brief-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      queuedRecipients: 1,
      followedWatchlistRecipients: 2,
    });
    expect(recipientCreateMock).toHaveBeenCalledTimes(1);
    expect(recipientCreateMock).toHaveBeenCalledWith({
      data: {
        briefId: "brief-1",
        email: "investor@gpc.com",
        sentAt: null,
      },
    });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "investor@gpc.com",
      }),
    );
  });

  it("marks an already published brief without requeueing existing recipients", async () => {
    const { POST } = await import("../app/api/briefs/[id]/publish/route");
    const publishedAt = new Date("2026-05-06T15:30:00.000Z");

    briefFindUniqueMock.mockReset();
    briefFindUniqueMock.mockResolvedValueOnce({
      id: "brief-1",
      publishedAt,
      sourceHealth: {
        followedWatchlists: [{ id: "wl-1", name: "Quiet Assembly Focus" }],
      },
    });
    recipientFindManyMock.mockResolvedValueOnce([
      { email: "investor@gpc.com" },
      { email: "developer@gpc.com" },
    ]);

    const response = await POST(
      new Request("http://localhost/api/briefs/brief-1/publish", {
        method: "POST",
        body: JSON.stringify({ emails: [] }),
      }),
      { params: Promise.resolve({ id: "brief-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      publishedAt: publishedAt.toISOString(),
      queuedRecipients: 0,
      followedWatchlistRecipients: 2,
    });
    expect(recipientCreateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(briefUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishedAt,
          sourceHealth: expect.objectContaining({
            followedWatchlistDelivery: expect.objectContaining({
              recipientCount: 2,
              queuedRecipients: 0,
              publishedAt: publishedAt.toISOString(),
              watchlistCount: 1,
            }),
          }),
        }),
      }),
    );
  });

  it("returns 404 when the brief does not exist", async () => {
    const { POST } = await import("../app/api/briefs/[id]/publish/route");

    briefFindUniqueMock.mockReset();
    briefFindUniqueMock.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/briefs/missing/publish", {
        method: "POST",
        body: JSON.stringify({ emails: ["manual@gpc.com"] }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ ok: false, error: "Brief not found." });
    expect(briefUpdateMock).not.toHaveBeenCalled();
    expect(recipientCreateMock).not.toHaveBeenCalled();
  });
});
