# GCIR Monetization & Viral Launch Design

**Date**: 2026-05-02
**Status**: Approved

## Overview

Transform Gulf Coast Industrial Radar from a private beta into a self-serve $10/mo subscription product with viral distribution mechanics. Free radar map as top-of-funnel, paid tier unlocks deep intelligence features, shareable project cards and brief teasers create organic growth loops.

## Tier Model

| Feature | Free | Pro ($10/mo) |
|---|---|---|
| Radar map (all pins, name, score, corridor) | Yes | Yes |
| Project drawer — Summary tab | Yes | Yes |
| Project drawer — Signals, Parcels, Entities, Evidence, Actions tabs | Locked | Yes |
| Alerts page | Locked | Yes |
| Weekly briefs | Locked (teaser only) | Full + email delivery |
| Watchlists | Locked | Yes |
| Create shareable project cards | No | Yes |
| View shared project cards | Yes | Yes |
| Proof / Admin | Admin-only | Admin-only |

## Schema Changes

Add to `User` model:
```
stripeCustomerId     String?   @unique
stripeSubscriptionId String?
plan                 String    @default("free")  // "free" | "pro"
planExpiresAt        DateTime?
```

New `Subscriber` model:
```
id        String   @id @default(cuid())
email     String   @unique
source    String   @default("landing")  // "landing" | "brief_share"
createdAt DateTime @default(now())
```

Helper: `getPlan(userId): "free" | "pro"` — reads User.plan, checks planExpiresAt for grace period.

## Stripe Integration

- One Product: "GCIR Pro" at $10/mo recurring
- Stripe Checkout (hosted) for payment collection
- Stripe Customer Portal for billing self-serve

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/stripe/checkout` | POST | Create Checkout session, return URL |
| `/api/webhooks/stripe` | POST | Stripe signature-verified event handler |
| `/api/stripe/portal` | GET | Create Portal session, return URL |

### Webhook Events

| Event | Action |
|---|---|
| `checkout.session.completed` | Set plan="pro", store stripeCustomerId + stripeSubscriptionId |
| `customer.subscription.updated` | Update plan and planExpiresAt based on status |
| `customer.subscription.deleted` | Set plan="free", clear subscription fields |
| `invoice.payment_failed` | Set plan="free", planExpiresAt = current period end |

## Landing Page

Public route at `/` replacing the current redirect to /radar.

Sections top to bottom:
1. **Nav** — Logo, Features/Pricing anchors, Sign In, "Get Started Free" CTA
2. **Hero** — Headline, subhead, CTA. Static radar screenshot background.
3. **Social proof bar** — Live DB stats: projects tracked, signals processed, sources monitored
4. **Feature cards** (4) — Radar, Alerts, Briefs, Watchlists
5. **Pricing** — Free vs Pro side-by-side
6. **Email capture** — "Get a free sample brief" → stores Subscriber, sends teaser via Resend
7. **Footer** — Logo, tagline, contact, sign-in link

Design: Inter + JetBrains Mono, dark theme matching app, professional/dense.

## Viral Mechanics

### Shareable Project Cards

- Public route: `/share/project/[id]` (no auth)
- Shows: project name, score badge, corridor, stage, top 3 signal summaries, static map thumbnail
- Dynamic OG image (1200x630) via Next.js `opengraph-image.tsx`
- CTA: "See full analysis on Gulf Coast Industrial Radar" → landing page with `?ref=share`
- Pro users create share links from drawer; free users see upgrade prompt

### Brief Teaser Emails

- Landing page email capture stores Subscriber
- Weekly cron sends teaser: brief title, top 3 movers with deltas, upgrade CTA
- Paid user brief sharing: non-subscriber recipients get teaser version

### Attribution

Footer on all shared cards and teaser emails: "Gulf Coast Industrial Radar - gulfcoastradar.com"

## Tier Gating Strategy

Component-level, not middleware-level. Free users can navigate to all routes. Locked features render an in-place upgrade card (not a redirect or modal) with feature description and "Upgrade to Pro - $10/mo" button linking to Stripe Checkout.

## Bug Fixes

| Issue | Fix |
|---|---|
| Hardcoded "13 watching" in topbar | Live count query or "Live" badge |
| QLAD distanceMiles = 0 stub | Haversine distance to cluster centroid |
| Feature gates off by default | Enable in production env |
| Resend not wired | Set RESEND_API_KEY in production |
| Brief sentAt at publish not send | Move to after Resend API success |

## Polish

- Skeleton loaders for radar list, drawer tabs, alerts, briefs
- Empty states with helpful CTAs for new users
- Upgrade cards (in-place, not modal) for locked features
- Mobile responsive: drawer as bottom sheet on narrow viewports
- React error boundaries per page section
- Topbar: plan badge + "Manage Billing" link to Stripe Portal

## Build Order

1. Schema changes + getPlan() helper
2. Stripe integration (checkout, webhooks, portal)
3. Tier gating (component-level free/pro split)
4. Landing page
5. Shareable project cards + OG images
6. Brief teaser emails
7. Bug fixes
8. Polish

## Out of Scope

- Referral program / invite credits
- Annual pricing / team pricing
- Blog / testimonials
- Performance optimization (force-dynamic → ISR)
- Auth bypass naming cleanup
