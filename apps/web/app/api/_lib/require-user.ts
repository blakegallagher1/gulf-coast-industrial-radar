import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

function authBypassed() {
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const allowDevBypass =
    authDisabled &&
    (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "true");

  return allowDevBypass || !hasClerkKey;
}

export async function requireUser() {
  if (authBypassed()) {
    return { ok: true as const, userId: null as string | null };
  }

  const session = await auth();
  if (!session.userId) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const, userId: session.userId };
}

export type DatabaseUserIdentity = {
  id: string | null;
  clerkUserId: string | null;
  role: string;
  developmentBypass: boolean;
};

export async function getDatabaseUser(): Promise<DatabaseUserIdentity | null> {
  const gate = await requireUser();
  if (!gate.ok) return null;
  if (!gate.userId) {
    return { id: null, clerkUserId: null, role: "operator", developmentBypass: true };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: gate.userId },
    select: { id: true, clerkId: true, role: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    clerkUserId: user.clerkId,
    role: user.role,
    developmentBypass: false,
  };
}

export async function requireDatabaseUser() {
  const gate = await requireUser();
  if (!gate.ok) return gate;
  if (!gate.userId) {
    return {
      ok: true as const,
      clerkUserId: null,
      databaseUserId: null,
      role: "operator",
      developmentBypass: true,
    };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: gate.userId },
    select: { id: true, role: true },
  });
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Authenticated user profile is not provisioned." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    clerkUserId: gate.userId,
    databaseUserId: user.id,
    role: user.role,
    developmentBypass: false,
  };
}
