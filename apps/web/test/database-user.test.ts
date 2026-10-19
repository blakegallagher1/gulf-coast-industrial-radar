import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const userFindUniqueMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@gcir/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
  },
}));

describe("requireDatabaseUser", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  beforeEach(() => {
    authMock.mockReset();
    userFindUniqueMock.mockReset();
    process.env.NEXT_PUBLIC_DISABLE_AUTH = "false";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_configured";
    authMock.mockResolvedValue({ userId: "user_clerk" });
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("resolves the Clerk id to the local database id", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "user_database", role: "analyst" });
    const { requireDatabaseUser } = await import("../app/api/_lib/require-user");

    const identity = await requireDatabaseUser();

    expect(identity).toMatchObject({
      ok: true,
      clerkUserId: "user_clerk",
      databaseUserId: "user_database",
      role: "analyst",
    });
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { clerkId: "user_clerk" },
      select: { id: true, role: true },
    });
  });

  it("fails explicitly when the authenticated Clerk user is not provisioned locally", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    const { requireDatabaseUser } = await import("../app/api/_lib/require-user");

    const identity = await requireDatabaseUser();

    expect(identity.ok).toBe(false);
    if (identity.ok) throw new Error("Expected missing profile to fail.");
    expect(identity.response.status).toBe(403);
    expect(await identity.response.json()).toMatchObject({
      error: "Authenticated user profile is not provisioned.",
    });
  });
});
