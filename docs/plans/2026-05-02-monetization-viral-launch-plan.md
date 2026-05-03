# GCIR Monetization & Viral Launch — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform GCIR from private beta to a self-serve $10/mo subscription product with free radar, Stripe billing, landing page, viral share mechanics, bug fixes, and polish.

**Architecture:** Stripe Checkout (hosted) for payments, webhook-driven plan state on the User model, component-level tier gating (not middleware), public share routes for viral distribution, Resend for brief teaser emails.

**Tech Stack:** Next.js 16, Prisma 6, Stripe (checkout + webhooks + portal), Resend, Clerk auth, Tailwind + Radix UI, MapLibre GL

---

## Task 1: Schema Changes — Billing Fields + Subscriber Model

**Files:**
- Modify: `packages/db/prisma/schema.prisma:165-178` (User model)
- Modify: `packages/db/prisma/schema.prisma` (add Subscriber model after BriefRecipient, ~line 628)
- Modify: `packages/db/src/index.ts` (no changes needed — Prisma re-exports automatically)

**Step 1: Add billing fields to User model**

In `packages/db/prisma/schema.prisma`, replace lines 165-178:

```prisma
model User {
  id                   String           @id @default(cuid())
  clerkId              String           @unique
  email                String           @unique
  name                 String?
  imageUrl             String?
  org                  String?
  role                 String           @default("analyst")
  plan                 String           @default("free")
  stripeCustomerId     String?          @unique
  stripeSubscriptionId String?
  planExpiresAt        DateTime?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt
  watchlists           Watchlist[]
  reviews              AnalystReview[]
  briefRecipients      BriefRecipient[]
}
```

**Step 2: Add Subscriber model**

Add after the `BriefRecipient` model (after line ~627):

```prisma
model Subscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  source    String   @default("landing")
  createdAt DateTime @default(now())
}
```

**Step 3: Generate migration and Prisma client**

Run: `cd packages/db && pnpm prisma:generate`

Then: `cd ../.. && pnpm db:push`

(Use `db:push` for speed — this is additive, non-destructive. Migrate later for production.)

Expected: Prisma client regenerated with new fields. No data loss — all new fields are optional or have defaults.

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): add billing fields to User + Subscriber model

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Install Stripe + Create getPlan Helper

**Files:**
- Modify: `apps/web/package.json` (add stripe dependency)
- Create: `apps/web/lib/plan.ts`
- Create: `apps/web/lib/stripe.ts`

**Step 1: Install Stripe SDK**

Run: `cd apps/web && pnpm add stripe`

**Step 2: Create Stripe client singleton**

Create `apps/web/lib/stripe.ts`:

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
  typescript: true,
});
```

**Step 3: Create getPlan helper**

Create `apps/web/lib/plan.ts`:

```typescript
import { prisma } from "@gcir/db";

export type Plan = "free" | "pro";

export async function getPlan(clerkId: string | null): Promise<Plan> {
  if (!clerkId) return "free";

  const user = await prisma.user.findFirst({
    where: { clerkId },
    select: { plan: true, planExpiresAt: true },
  });

  if (!user) return "free";
  if (user.plan !== "pro") return "free";

  if (user.planExpiresAt && user.planExpiresAt < new Date()) {
    return "free";
  }

  return "pro";
}
```

**Step 4: Commit**

```bash
git add apps/web/package.json apps/web/lib/stripe.ts apps/web/lib/plan.ts pnpm-lock.yaml
git commit -m "feat(web): add Stripe SDK + getPlan helper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Stripe Checkout API Route

**Files:**
- Create: `apps/web/app/api/stripe/checkout/route.ts`

**Step 1: Create checkout route**

Create `apps/web/app/api/stripe/checkout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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

  const checkoutSession = await stripe.checkout.sessions.create({
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
```

**Step 2: Commit**

```bash
git add apps/web/app/api/stripe/checkout/route.ts
git commit -m "feat(api): add Stripe Checkout session route

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Stripe Webhook Route

**Files:**
- Create: `apps/web/app/api/webhooks/stripe/route.ts`

**Step 1: Create webhook handler**

Create `apps/web/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@gcir/db";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "pro",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          planExpiresAt: null,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (!user) break;

      const active = sub.status === "active" || sub.status === "trialing";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: active ? "pro" : "free",
          stripeSubscriptionId: sub.id,
          planExpiresAt: active
            ? null
            : new Date(sub.current_period_end * 1000),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (!user) break;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "free",
          stripeSubscriptionId: null,
          planExpiresAt: new Date(sub.current_period_end * 1000),
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: invoice.customer as string },
      });
      if (!user) break;

      const sub = invoice.subscription
        ? await stripe.subscriptions.retrieve(invoice.subscription as string)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: "free",
          planExpiresAt: sub
            ? new Date(sub.current_period_end * 1000)
            : new Date(),
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

**Step 2: Commit**

```bash
git add apps/web/app/api/webhooks/stripe/route.ts
git commit -m "feat(api): add Stripe webhook handler for subscription lifecycle

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Stripe Customer Portal Route

**Files:**
- Create: `apps/web/app/api/stripe/portal/route.ts`

**Step 1: Create portal route**

Create `apps/web/app/api/stripe/portal/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/radar`,
  });

  return NextResponse.json({ url: portalSession.url });
}
```

**Step 2: Commit**

```bash
git add apps/web/app/api/stripe/portal/route.ts
git commit -m "feat(api): add Stripe Customer Portal route

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update Middleware — Public Routes for Share + Webhooks

**Files:**
- Modify: `apps/web/middleware.ts:19-25`

**Step 1: Add share and webhook routes to public matcher**

In `apps/web/middleware.ts`, replace lines 19-25:

```typescript
const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)",
  "/api/health",
  "/api/cron/(.*)",
  "/api/webhooks/(.*)",
]);
```

**Step 2: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(middleware): add /share and /api/webhooks to public routes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: UpgradeGate Component

**Files:**
- Create: `apps/web/components/upgrade-gate.tsx`

**Step 1: Create the reusable upgrade gate**

Create `apps/web/components/upgrade-gate.tsx`:

```tsx
"use client";

import { Lock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpgradeGate({
  feature,
  description,
}: {
  feature: string;
  description: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-bg-2 px-8 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.08]">
        <Lock className="h-5 w-5 text-accent" />
      </div>
      <h3 className="mb-1.5 text-[16px] font-semibold text-ink">{feature}</h3>
      <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-muted">
        {description}
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="gcir-btn-primary gap-2 px-5 py-2"
      >
        <Zap className="h-3.5 w-3.5" />
        {loading ? "Redirecting..." : "Upgrade to Pro — $10/mo"}
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/upgrade-gate.tsx
git commit -m "feat(ui): add reusable UpgradeGate component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Tier-Gate the Drawer Tabs

**Files:**
- Modify: `apps/web/components/radar/Drawer.tsx:1-233`

**Step 1: Add plan prop and gate non-summary tabs**

In `apps/web/components/radar/Drawer.tsx`:

Add import at line 7 (after the lucide import):

```typescript
import { UpgradeGate } from "@/components/upgrade-gate";
```

Change the component signature at line 29 from:

```typescript
export function Drawer({ project }: { project: RadarProject | null }) {
```

to:

```typescript
export function Drawer({ project, plan = "free" }: { project: RadarProject | null; plan?: "free" | "pro" }) {
```

Replace the tab content rendering block at lines 223-230:

```tsx
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {tab === "summary" && <SummaryTab project={project} detail={detail} />}
        {tab === "timeline" && (plan === "pro" ? <TimelineTab projectId={project.id} /> : <UpgradeGate feature="Signal Timeline" description="See every signal as it arrives — permit filings, entity formations, land transfers, and more. Upgrade to track project evolution in real time." />)}
        {tab === "parcels" && (plan === "pro" ? <ParcelsTab projectId={project.id} project={project} /> : <UpgradeGate feature="Parcels & Site Analysis" description="View individual parcels, ownership chains, acreage, and site geometry. Upgrade to see exactly where land is being assembled." />)}
        {tab === "entities" && (plan === "pro" ? <EntitiesTab projectId={project.id} /> : <UpgradeGate feature="Entity Graph" description="Map the LLCs, individuals, and corporate relationships behind each project. Upgrade to follow the money." />)}
        {tab === "evidence" && (plan === "pro" ? <EvidenceTab projectId={project.id} /> : <UpgradeGate feature="Evidence Archive" description="Access the original permits, filings, and public records backing each signal. Upgrade for full source transparency." />)}
        {tab === "actions" && (plan === "pro" ? <ActionsTab projectId={project.id} /> : <UpgradeGate feature="Recommended Actions" description="Get AI-generated next moves tailored to your role — investor, developer, engineer, or construction. Upgrade to act on intelligence." />)}
      </div>
```

**Step 2: Pass plan from RadarShell to Drawer**

In `apps/web/components/radar/RadarShell.tsx`, change the `RadarShell` props to accept `plan`:

At the component definition (around line 30), add `plan` to props:

```typescript
export function RadarShell({
  projects,
  sources,
  plan = "free",
}: {
  projects: RadarProject[];
  sources: { slug: string; status: string }[];
  plan?: "free" | "pro";
}) {
```

Then pass it to Drawer (around line 270):

From: `<Drawer project={activeProject} />`
To: `<Drawer project={activeProject} plan={plan} />`

**Step 3: Pass plan from radar page to RadarShell**

In `apps/web/app/(app)/radar/page.tsx`, add plan resolution:

Add import at top:

```typescript
import { auth } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plan";
```

Inside the server component function, after existing queries, add:

```typescript
  const session = await auth().catch(() => null);
  const plan = await getPlan(session?.userId ?? null);
```

Pass to RadarShell:

From: `<RadarShell projects={radarProjects} sources={sourceSummary} />`
To: `<RadarShell projects={radarProjects} sources={sourceSummary} plan={plan} />`

**Step 4: Commit**

```bash
git add apps/web/components/radar/Drawer.tsx apps/web/components/radar/RadarShell.tsx apps/web/app/\(app\)/radar/page.tsx
git commit -m "feat(radar): gate drawer tabs behind Pro plan

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Tier-Gate Alerts, Briefs, and Watchlists Pages

**Files:**
- Modify: `apps/web/app/(app)/alerts/page.tsx`
- Modify: `apps/web/app/(app)/briefs/page.tsx`
- Modify: `apps/web/app/(app)/watchlists/page.tsx`

**Step 1: Gate alerts page**

In `apps/web/app/(app)/alerts/page.tsx`, add at the top of the file (with other imports):

```typescript
import { auth } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plan";
import { UpgradeGate } from "@/components/upgrade-gate";
```

Inside the server component, before the return statement, add:

```typescript
  const session = await auth().catch(() => null);
  const plan = await getPlan(session?.userId ?? null);

  if (plan === "free") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <UpgradeGate
          feature="Alerts"
          description="Get notified when quiet land assemblies, new permit filings, or entity formations signal a new industrial project. Upgrade to see alerts as they fire."
        />
      </div>
    );
  }
```

**Step 2: Gate briefs page**

In `apps/web/app/(app)/briefs/page.tsx`, same pattern — add imports and plan check before return:

```typescript
import { auth } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plan";
import { UpgradeGate } from "@/components/upgrade-gate";
```

```typescript
  const session = await auth().catch(() => null);
  const plan = await getPlan(session?.userId ?? null);

  if (plan === "free") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <UpgradeGate
          feature="Weekly Briefs"
          description="Every Monday, an AI-generated analyst brief covers the top movers, new formations, and recommended actions across the Gulf Coast corridor. Upgrade to receive the full brief."
        />
      </div>
    );
  }
```

**Step 3: Gate watchlists page**

In `apps/web/app/(app)/watchlists/page.tsx`, same pattern:

```typescript
import { auth } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plan";
import { UpgradeGate } from "@/components/upgrade-gate";
```

```typescript
  const session = await auth().catch(() => null);
  const plan = await getPlan(session?.userId ?? null);

  if (plan === "free") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <UpgradeGate
          feature="Watchlists"
          description="Save custom filters, track specific projects, and get notified when things change. Upgrade to build your watchlist."
        />
      </div>
    );
  }
```

**Step 4: Commit**

```bash
git add apps/web/app/\(app\)/alerts/page.tsx apps/web/app/\(app\)/briefs/page.tsx apps/web/app/\(app\)/watchlists/page.tsx
git commit -m "feat(pages): gate alerts, briefs, watchlists behind Pro plan

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Landing Page

**Files:**
- Rewrite: `apps/web/app/page.tsx`
- Create: `apps/web/app/landing-pricing.tsx` (client component for Stripe CTA)
- Create: `apps/web/app/landing-email-capture.tsx` (client component for email capture)

**Step 1: Create pricing CTA client component**

Create `apps/web/app/landing-pricing.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

export function PricingCTA() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) window.location.href = body.url;
      else window.location.href = "/sign-up";
    } catch {
      window.location.href = "/sign-up";
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-ink"
    >
      <Zap className="h-4 w-4" />
      {loading ? "Redirecting..." : "Subscribe — $10/mo"}
    </button>
  );
}
```

**Step 2: Create email capture client component**

Create `apps/web/app/landing-email-capture.tsx`:

```tsx
"use client";

import { useState } from "react";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="text-[14px] font-medium text-accent">
        Check your inbox — a sample brief is on the way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-10 w-64 rounded-lg border border-stone-700 bg-stone-800 px-3 text-[13px] text-white placeholder:text-stone-500 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-10 rounded-lg bg-white px-5 text-[13px] font-semibold text-ink transition-colors hover:bg-stone-100"
      >
        {status === "sending" ? "Sending..." : "Get a free sample brief"}
      </button>
    </form>
  );
}
```

**Step 3: Create subscribe API route**

Create `apps/web/app/api/subscribe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    await prisma.subscriber.upsert({
      where: { email: email.toLowerCase().trim() },
      create: { email: email.toLowerCase().trim(), source: "landing" },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
```

**Step 4: Rewrite the landing page**

Rewrite `apps/web/app/page.tsx`:

```tsx
import Link from "next/link";
import { prisma } from "@gcir/db";
import {
  Radar,
  Bell,
  FileText,
  Bookmark,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Map,
} from "lucide-react";
import { PricingCTA } from "./landing-pricing";
import { EmailCapture } from "./landing-email-capture";

export default async function LandingPage() {
  const [projectCount, signalCount, sourceCount] = await Promise.all([
    prisma.project.count(),
    prisma.signal.count(),
    prisma.source.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5 font-semibold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-white/20 to-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
            <Radar className="h-3.5 w-3.5" strokeWidth={1.6} />
          </div>
          <span className="text-[14px]">Gulf Coast Industrial Radar</span>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <a href="#features" className="text-stone-400 transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="text-stone-400 transition-colors hover:text-white">Pricing</a>
          <Link href="/sign-in" className="text-stone-400 transition-colors hover:text-white">Sign In</Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-white/10 px-4 py-1.5 font-medium text-white transition-colors hover:bg-white/20"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <h1 className="mx-auto max-w-3xl text-[48px] font-semibold leading-[1.1] tracking-tighter">
          See industrial projects forming{" "}
          <span className="text-accent">before the market does.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-stone-400">
          Gulf Coast Industrial Radar detects land assemblies, permit filings, entity formations, and capital signals across the Louisiana-Texas petrochemical corridor — early enough to act.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-[14px] font-semibold text-ink shadow-sm transition-colors hover:bg-stone-100"
          >
            Explore the Radar — Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-700 px-6 text-[14px] font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-white"
          >
            See pricing
          </a>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-stone-800 bg-stone-900/50">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-12 px-6 py-6">
          <div className="text-center">
            <div className="font-mono text-[28px] font-semibold tracking-tight text-white">
              {projectCount}
            </div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-stone-500">
              Projects tracked
            </div>
          </div>
          <div className="h-8 w-px bg-stone-800" />
          <div className="text-center">
            <div className="font-mono text-[28px] font-semibold tracking-tight text-white">
              {signalCount.toLocaleString()}
            </div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-stone-500">
              Signals processed
            </div>
          </div>
          <div className="h-8 w-px bg-stone-800" />
          <div className="text-center">
            <div className="font-mono text-[28px] font-semibold tracking-tight text-white">
              {sourceCount}
            </div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-stone-500">
              Live sources
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-3 text-center text-[12px] font-semibold uppercase tracking-wider text-accent">
          Intelligence Platform
        </h2>
        <p className="mb-14 text-center text-[28px] font-semibold tracking-tight">
          Everything you need to get ahead of the market
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Map,
              title: "Interactive Radar",
              desc: "Scored industrial projects plotted on a live map. Filter by corridor, score band, and stage. Click any pin for deep project intelligence.",
              free: true,
            },
            {
              icon: Bell,
              title: "Formation Alerts",
              desc: "Real-time notifications when quiet land assemblies, new permits, or entity formations signal a project is taking shape.",
              free: false,
            },
            {
              icon: FileText,
              title: "Weekly Briefs",
              desc: "Every Monday, an AI-generated analyst brief covers top movers, new formations, recommended actions, and source health.",
              free: false,
            },
            {
              icon: Bookmark,
              title: "Watchlists",
              desc: "Save custom filters, track specific projects across corridors, and get alerted when your watchlist changes.",
              free: false,
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-stone-800 bg-stone-900/50 p-7"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mb-2 text-[16px] font-semibold">{f.title}</h3>
              <p className="mb-3 text-[13.5px] leading-relaxed text-stone-400">
                {f.desc}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                {f.free ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-accent" /> Free
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 text-warn" /> Pro
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="mb-3 text-center text-[12px] font-semibold uppercase tracking-wider text-accent">
          Pricing
        </h2>
        <p className="mb-14 text-center text-[28px] font-semibold tracking-tight">
          Start free. Upgrade when you need the full picture.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free tier */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-8">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">Free</h3>
            <div className="mt-3 font-mono text-[40px] font-semibold tracking-tighter">$0</div>
            <p className="mt-2 text-[13.5px] text-stone-400">Browse the radar. See what's forming.</p>
            <ul className="mt-6 space-y-3 text-[13.5px] text-stone-300">
              {["Interactive radar map", "All project pins with scores", "Project summary tab", "View shared project cards"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="mt-8 flex h-10 items-center justify-center rounded-lg border border-stone-700 text-[13px] font-semibold text-white transition-colors hover:bg-white/5"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro tier */}
          <div className="rounded-xl border border-accent/40 bg-accent/[0.04] p-8 shadow-[0_0_30px_-10px_rgba(16,163,127,0.15)]">
            <div className="flex items-center gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-accent">Pro</h3>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">POPULAR</span>
            </div>
            <div className="mt-3">
              <span className="font-mono text-[40px] font-semibold tracking-tighter">$10</span>
              <span className="text-[14px] text-stone-400">/mo</span>
            </div>
            <p className="mt-2 text-[13.5px] text-stone-400">Full intelligence. Act before the market.</p>
            <ul className="mt-6 space-y-3 text-[13.5px] text-stone-300">
              {[
                "Everything in Free",
                "Full project drawer (6 tabs)",
                "Formation alerts",
                "AI weekly briefs + email delivery",
                "Watchlists with notifications",
                "Shareable project cards",
                "Recommended actions by role",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PricingCTA />
            </div>
          </div>
        </div>
      </section>

      {/* Email capture */}
      <section className="border-t border-stone-800 bg-stone-900/50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Shield className="mx-auto mb-4 h-8 w-8 text-stone-600" />
          <h2 className="mb-2 text-[20px] font-semibold">Get a free sample brief</h2>
          <p className="mb-6 text-[13.5px] text-stone-400">
            See what a GCIR weekly intelligence brief looks like — no account needed.
          </p>
          <div className="flex justify-center">
            <EmailCapture />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-[13px] text-stone-500">
            <Radar className="h-3.5 w-3.5" />
            Gulf Coast Industrial Radar
            <span className="text-stone-700">·</span>
            Built in Baton Rouge
          </div>
          <div className="flex items-center gap-4 text-[12.5px] text-stone-500">
            <a href="mailto:blake@gallagherpropco.com" className="hover:text-stone-300">Contact</a>
            <Link href="/sign-in" className="hover:text-stone-300">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

**Step 5: Add /api/subscribe to public routes in middleware**

In `apps/web/middleware.ts`, add to the `isPublic` matcher:

```typescript
  "/api/subscribe",
```

**Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/landing-pricing.tsx apps/web/app/landing-email-capture.tsx apps/web/app/api/subscribe/route.ts apps/web/middleware.ts
git commit -m "feat(landing): add public landing page with pricing, features, and email capture

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Shareable Project Cards + OG Image

**Files:**
- Create: `apps/web/app/share/project/[id]/page.tsx`
- Create: `apps/web/app/share/project/[id]/opengraph-image.tsx`

**Step 1: Create the public share page**

Create `apps/web/app/share/project/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@gcir/db";
import { ArrowRight, MapPin, Radar, TrendingUp } from "lucide-react";

function scoreBand(score: number) {
  if (score >= 80) return { label: "High", color: "#b3261e" };
  if (score >= 60) return { label: "Elevated", color: "#c97a16" };
  if (score >= 40) return { label: "Watch", color: "#1f5fa8" };
  return { label: "Weak", color: "#6b6b6b" };
}

export default async function ShareProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      sites: { take: 1 },
      signals: { orderBy: { observedAt: "desc" }, take: 3 },
    },
  });

  if (!project) {
    const byPublicId = await prisma.project.findFirst({
      where: { publicId: id },
      include: {
        sites: { take: 1 },
        signals: { orderBy: { observedAt: "desc" }, take: 3 },
      },
    });
    if (!byPublicId) notFound();
    return renderCard(byPublicId);
  }

  return renderCard(project);
}

function renderCard(project: any) {
  const band = scoreBand(project.score);
  const site = project.sites?.[0];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-lg">
        {/* Map thumbnail */}
        {site?.centerLat && site?.centerLng && (
          <div className="h-48 w-full bg-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+10a37f(${site.centerLng},${site.centerLat})/${site.centerLng},${site.centerLat},11,0/600x240@2x?access_token=${process.env.MAPBOX_TOKEN ?? ""}`}
              alt="Project location"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          {/* Score badge */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl font-mono text-[24px] font-bold text-white"
              style={{ background: band.color }}
            >
              {project.score}
            </div>
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">
                Formation score · {band.label}
              </div>
              <h1 className="text-[20px] font-semibold leading-tight text-white">
                {project.name}
              </h1>
            </div>
          </div>

          {/* Details */}
          <div className="mb-4 flex flex-wrap gap-3 text-[12.5px] text-stone-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {project.parishCounty}{project.state ? `, ${project.state}` : ""}
            </span>
            {project.corridor && (
              <span className="rounded border border-stone-700 px-1.5 py-0.5 text-[11px] font-medium">
                {project.corridor}
              </span>
            )}
            <span className="rounded border border-stone-700 px-1.5 py-0.5 text-[11px] font-medium">
              {project.stage.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>

          {/* Top signals */}
          {project.signals.length > 0 && (
            <div className="mb-6 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Latest signals
              </div>
              {project.signals.map((s: any) => (
                <div key={s.id} className="flex items-start gap-2 text-[12.5px]">
                  <TrendingUp className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
                  <span className="text-stone-300">{s.subjectLabel}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/?ref=share`}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-ink"
          >
            See full analysis on Gulf Coast Industrial Radar
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Attribution */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-stone-600">
            <Radar className="h-3 w-3" />
            Gulf Coast Industrial Radar · gulfcoastradar.com
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } })
    ?? await prisma.project.findFirst({ where: { publicId: id } });

  if (!project) return { title: "Project Not Found" };

  const band = scoreBand(project.score);
  return {
    title: `${project.name} — Score ${project.score} (${band.label}) | GCIR`,
    description: `${project.name} in ${project.parishCounty}, ${project.state} — ${project.stage.toLowerCase().replace(/_/g, " ")} stage. Formation score ${project.score}/100. Tracked by Gulf Coast Industrial Radar.`,
    openGraph: {
      title: `${project.name} — Formation Score ${project.score}`,
      description: `${band.label} conviction industrial project in ${project.parishCounty}. ${project.stage.toLowerCase().replace(/_/g, " ")} stage.`,
      siteName: "Gulf Coast Industrial Radar",
    },
  };
}
```

**Step 2: Create OG image generator**

Create `apps/web/app/share/project/[id]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { prisma } from "@gcir/db";

export const runtime = "nodejs";
export const alt = "Project Score Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } })
    ?? await prisma.project.findFirst({ where: { publicId: id } });

  if (!project) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0d0d0d", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
        Project not found
      </div>,
      { ...size },
    );
  }

  const bandColor = project.score >= 80 ? "#b3261e" : project.score >= 60 ? "#c97a16" : project.score >= 40 ? "#1f5fa8" : "#6b6b6b";

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#0d0d0d", color: "#fff", padding: 60, flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 30 }}>
        <div style={{ display: "flex", width: 120, height: 120, borderRadius: 20, background: bandColor, alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 700, fontFamily: "monospace" }}>
          {project.score}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: "#8e8e8e" }}>
            Formation Score · {project.score >= 80 ? "HIGH" : project.score >= 60 ? "ELEVATED" : project.score >= 40 ? "WATCH" : "WEAK"}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1 }}>
            {project.name}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 18, color: "#8e8e8e", marginTop: 4 }}>
            <span>{project.parishCounty}, {project.state}</span>
            {project.corridor && <span>· {project.corridor}</span>}
            <span>· {project.stage.toLowerCase().replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: "#6b6b6b" }}>
          Gulf Coast Industrial Radar · gulfcoastradar.com
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#10a37f", background: "rgba(16,163,127,0.1)", borderRadius: 8, padding: "8px 16px" }}>
          See full analysis →
        </div>
      </div>
    </div>,
    { ...size },
  );
}
```

**Step 3: Add share button in Drawer for Pro users**

In `apps/web/components/radar/Drawer.tsx`, update the share button logic. Change the `shareProject` function (lines 51-62) and the share button (line 203-205):

Replace the `sharePayload` useMemo (lines 41-49):

```typescript
  const shareUrl = useMemo(() => {
    if (!project) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/share/project/${project.id}`;
  }, [project]);
```

Replace the `shareProject` function (lines 51-62):

```typescript
  const shareProject = async () => {
    if (!shareUrl) return;
    const payload = {
      title: project!.name,
      text: `${project!.name} — Formation Score ${project!.score}`,
      url: shareUrl,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // share is best-effort
    }
  };
```

Update the Share button (around line 203) to show upgrade prompt for free users:

```tsx
          {plan === "pro" ? (
            <button className="gcir-btn" onClick={shareProject}>
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          ) : (
            <button
              className="gcir-btn"
              onClick={() => {
                const el = document.querySelector('[data-tab="summary"]');
                if (el) el.scrollIntoView();
              }}
              title="Upgrade to Pro to share project cards"
            >
              <Share2 className="h-3.5 w-3.5 text-muted" /> Share
            </button>
          )}
```

**Step 4: Commit**

```bash
git add apps/web/app/share/project/\[id\]/page.tsx apps/web/app/share/project/\[id\]/opengraph-image.tsx apps/web/components/radar/Drawer.tsx
git commit -m "feat(share): add public shareable project cards with OG image generation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Bug Fix — Topbar Dynamic Count + Plan Badge + Billing Link

**Files:**
- Modify: `apps/web/components/topbar.tsx`
- Modify: `apps/web/app/(app)/layout.tsx`

**Step 1: Convert topbar to accept server props**

The topbar is currently a client component that can't do Prisma queries. We'll pass data down from the app layout.

Rewrite `apps/web/app/(app)/layout.tsx`:

```tsx
import { Topbar } from "@/components/topbar";
import { prisma } from "@gcir/db";
import { auth } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plan";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [watchlistCount, session] = await Promise.all([
    prisma.watchlist.count(),
    auth().catch(() => null),
  ]);
  const plan = await getPlan(session?.userId ?? null);

  return (
    <div className="flex h-screen flex-col">
      <Topbar watchlistCount={watchlistCount} plan={plan} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
```

**Step 2: Update topbar component**

In `apps/web/components/topbar.tsx`, update the component signature and replace the hardcoded "13 watching":

Change the function signature from:

```typescript
export function Topbar() {
```

to:

```typescript
export function Topbar({
  watchlistCount = 0,
  plan = "free",
}: {
  watchlistCount?: number;
  plan?: "free" | "pro";
}) {
```

Replace line 72-75 (the hardcoded pill):

```tsx
        <button className="gcir-pill" title="Watchlists tracking corridors">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Eye className="h-3 w-3" /> {watchlistCount} watching
        </button>
```

Add a plan badge after the pill (before the Bell button, around line 76):

```tsx
        <span className={cn(
          "inline-flex h-[22px] items-center rounded-full px-2 text-[10.5px] font-semibold uppercase tracking-wider",
          plan === "pro"
            ? "bg-accent/10 text-accent"
            : "bg-bg-3 text-muted"
        )}>
          {plan === "pro" ? "Pro" : "Free"}
        </span>
```

Add a "Manage Billing" button for Pro users. After the Settings button (around line 80), before the auth section, add:

```tsx
        {plan === "pro" && (
          <button
            className="gcir-icon-btn text-[11px] font-medium text-muted"
            title="Manage billing"
            onClick={async () => {
              const res = await fetch("/api/stripe/portal");
              const body = await res.json();
              if (body.url) window.location.href = body.url;
            }}
          >
            Billing
          </button>
        )}
```

Also remove the "/ private beta" text from line 34 since we're launching publicly:

Change:
```tsx
          <span className="ml-1.5 text-[12.5px] font-normal text-muted-2">/ private beta</span>
```
to:
```tsx
          <span className="ml-1.5 text-[12.5px] font-normal text-muted-2">/ beta</span>
```

**Step 3: Commit**

```bash
git add apps/web/components/topbar.tsx apps/web/app/\(app\)/layout.tsx
git commit -m "fix(topbar): replace hardcoded '13 watching' with live count, add plan badge

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: Bug Fix — QLAD Distance Calculation

**Files:**
- Modify: `apps/worker/src/jobs/qlad-evaluate.ts:320-326`

**Step 1: Implement haversine distance**

In `apps/worker/src/jobs/qlad-evaluate.ts`, find the distance stub (around lines 320-326) and replace it with a real haversine calculation.

Replace the stub block:

```typescript
      // We don't have per-parcel coords reliably yet — leave at 0 mi
      void cx;
      void cy;
      a.distanceMiles = 0;
```

with:

```typescript
      if (a.lat != null && a.lng != null) {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const R = 3958.8; // Earth radius in miles
        const dLat = toRad(a.lat - cy);
        const dLng = toRad(a.lng - cx);
        const sinLat = Math.sin(dLat / 2);
        const sinLng = Math.sin(dLng / 2);
        const h = sinLat * sinLat + Math.cos(toRad(cy)) * Math.cos(toRad(a.lat)) * sinLng * sinLng;
        a.distanceMiles = 2 * R * Math.asin(Math.sqrt(h));
      } else {
        a.distanceMiles = 0;
      }
```

Note: `cx` and `cy` are the cluster centroid coordinates, and `a.lat`/`a.lng` are the individual acquisition coordinates. Check the surrounding code to confirm the exact variable names — they may be named differently. The key is replacing `void cx; void cy; a.distanceMiles = 0;` with the haversine formula.

**Step 2: Commit**

```bash
git add apps/worker/src/jobs/qlad-evaluate.ts
git commit -m "fix(qlad): implement haversine distance to cluster centroid (was stubbed at 0)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 14: Bug Fix — Brief sentAt Timing

**Files:**
- Modify: `apps/web/app/api/briefs/[id]/publish/route.ts`

**Step 1: Check current publish route**

Read the file and find where `sentAt` is set. Currently it's set during the publish transaction (before any email is actually sent). The fix: set `publishedAt` in the transaction, but leave `sentAt` on each `BriefRecipient` as null — it should be set only after actual Resend delivery succeeds. If Resend is not yet wired, this is a no-op change that sets up the correct pattern.

In the transaction that creates `BriefRecipient` rows, ensure `sentAt` is NOT set:

```typescript
  // BriefRecipient rows should be created with sentAt: null
  // sentAt gets set only after Resend confirms delivery
```

**Step 2: Commit**

```bash
git add apps/web/app/api/briefs/\[id\]/publish/route.ts
git commit -m "fix(briefs): don't set sentAt at publish time — defer to actual email delivery

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 15: Polish — Loading Skeletons + Empty States + Error Boundaries

**Files:**
- Create: `apps/web/components/skeleton.tsx`
- Create: `apps/web/components/empty-state.tsx`
- Create: `apps/web/app/(app)/error.tsx`

**Step 1: Create skeleton component**

Create `apps/web/components/skeleton.tsx`:

```tsx
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-bg-3", className)} />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create empty state component**

Create `apps/web/components/empty-state.tsx`:

```tsx
import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
  href,
}: {
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="mb-1.5 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mb-4 max-w-sm text-[13px] text-muted">{description}</p>
      {action && href && (
        <Link href={href as any} className="gcir-btn-primary px-4">
          {action}
        </Link>
      )}
    </div>
  );
}
```

**Step 3: Create app-level error boundary**

Create `apps/web/app/(app)/error.tsx`:

```tsx
"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 text-[16px] font-semibold text-ink">Something went wrong</h2>
      <p className="mb-4 text-[13px] text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="gcir-btn">
        Try again
      </button>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/components/skeleton.tsx apps/web/components/empty-state.tsx apps/web/app/\(app\)/error.tsx
git commit -m "feat(ui): add skeleton, empty state, and error boundary components

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 16: Polish — Mobile Responsive Drawer

**Files:**
- Modify: `apps/web/components/radar/Drawer.tsx`
- Modify: `apps/web/app/globals.css`

**Step 1: Add responsive breakpoints to globals.css**

In `apps/web/app/globals.css`, add after the existing `:root` block (after line 12):

```css
  @media (max-width: 768px) {
    :root {
      --drawer-w: 100vw;
      --rail-w: 0px;
    }
  }
```

**Step 2: Update Drawer for mobile**

In the Drawer's outer `<aside>` (line 120), add responsive classes. Change:

```tsx
    <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col overflow-hidden border-l border-line bg-white">
```

to:

```tsx
    <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col overflow-hidden border-l border-line bg-white max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-[70vh] max-md:w-full max-md:rounded-t-xl max-md:border-l-0 max-md:border-t max-md:shadow-lg">
```

Also update the empty-state aside (line 111) similarly:

```tsx
    <aside className="flex w-[var(--drawer-w)] flex-shrink-0 flex-col border-l border-line bg-white max-md:hidden">
```

**Step 3: Commit**

```bash
git add apps/web/components/radar/Drawer.tsx apps/web/app/globals.css
git commit -m "feat(ui): make drawer responsive — bottom sheet on mobile

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 17: Environment Variables + .env.example Update

**Files:**
- Modify: `.env.example`

**Step 1: Add Stripe env vars to .env.example**

Add to `.env.example`:

```env
# ── Stripe ──────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ── Mapbox (for share card map thumbnails) ──────────────
MAPBOX_TOKEN=pk.eyJ...
```

**Step 2: Document production env changes needed**

Add to `.env.example` comments:

```env
# ─�� Production launch checklist ─────────────────────────
# 1. Set FEATURE_QLAD_LIVE_ALERTING=true
# 2. Set FEATURE_PERPLEXITY_VALIDATION=true
# 3. Set WORKER_CRON_ENABLED=true
# 4. Set RESEND_API_KEY to a live Resend key
# 5. Set STRIPE_SECRET_KEY to live Stripe key
# 6. Set STRIPE_WEBHOOK_SECRET from Stripe dashboard
# 7. Set STRIPE_PRICE_ID to the $10/mo price ID
# 8. Configure Stripe webhook endpoint: https://yourdomain.com/api/webhooks/stripe
# 9. Enable Stripe Customer Portal in Stripe dashboard
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): add Stripe + Mapbox vars and production launch checklist

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 18: Final Verification

**Step 1: Type-check the entire project**

Run: `pnpm typecheck`

Expected: No errors. Fix any TypeScript issues that arise from the new code.

**Step 2: Build the web app**

Run: `pnpm --filter @gcir/web build`

Expected: Successful build. Fix any build errors.

**Step 3: Start dev server and test**

Run: `pnpm dev:web`

Test the following flows:
1. Landing page loads at `/` with stats, features, pricing
2. "Get Started Free" links to `/sign-up`
3. After sign-in, radar loads with all project pins
4. Free user sees Summary tab, other tabs show UpgradeGate
5. Free user sees upgrade prompts on /alerts, /briefs, /watchlists
6. Topbar shows live watchlist count and "Free" badge
7. `/share/project/[id]` loads publicly with project card
8. Email capture on landing page submits successfully

**Step 4: Final commit**

Fix any issues found during testing, then:

```bash
git add -A
git commit -m "fix: address build and type-check issues from monetization launch

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Stripe Setup Checklist (Manual — Not Code)

These steps happen in the Stripe Dashboard, not in code:

1. Create a Product called "GCIR Pro" with a $10/mo recurring price
2. Copy the Price ID → set as `STRIPE_PRICE_ID` env var
3. Create a webhook endpoint pointing to `https://yourdomain.com/api/webhooks/stripe`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`
6. Enable the Customer Portal in Stripe settings
7. For testing: use Stripe test mode keys first
