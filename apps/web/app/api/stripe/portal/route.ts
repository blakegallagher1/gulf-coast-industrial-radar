import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { requireUser } from "@/app/api/_lib/require-user";
import { prisma } from "@gcir/db";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;
  if (!session.userId) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { clerkId: session.userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "no billing account" }, { status: 404 });
  }

  const origin = new URL(req.url).origin;

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/radar`,
  });

  return NextResponse.json({ url: portalSession.url });
}
