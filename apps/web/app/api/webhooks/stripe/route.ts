import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@gcir/db";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const userId = obj.metadata?.userId;
      if (!userId) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "pro",
          stripeCustomerId: obj.customer as string,
          stripeSubscriptionId: obj.subscription as string,
          planExpiresAt: null,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: obj.customer as string },
      });
      if (!user) break;

      const active = obj.status === "active" || obj.status === "trialing";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: active ? "pro" : "free",
          stripeSubscriptionId: obj.id,
          planExpiresAt: active
            ? null
            : new Date(obj.current_period_end * 1000),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: obj.customer as string },
      });
      if (!user) break;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "free",
          stripeSubscriptionId: null,
          planExpiresAt: new Date(obj.current_period_end * 1000),
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: obj.customer as string },
      });
      if (!user) break;

      const sub = obj.subscription
        ? await getStripe().subscriptions.retrieve(obj.subscription as string)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "free",
          planExpiresAt: sub
            ? new Date((sub as any).current_period_end * 1000)
            : new Date(),
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
