import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { requireUser } from "@/app/api/_lib/require-user";
import { prisma } from "@gcir/db";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;
  if (!session.userId) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { clerkId: session.userId },
    select: { id: true, email: true, plan: true, stripeCustomerId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  if (user.plan === "pro") {
    return NextResponse.json({ error: "already subscribed" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/radar?upgraded=1`,
    cancel_url: `${origin}/radar`,
    metadata: { userId: user.id, clerkId: session.userId },
    subscription_data: {
      metadata: { userId: user.id, clerkId: session.userId },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
