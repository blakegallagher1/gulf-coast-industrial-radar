import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function authBypassed() {
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  const allowDevBypass =
    authDisabled &&
    (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "true");
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return authDisabled || allowDevBypass || !hasClerkKey;
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
