# Retention & Growth Enablers — Design

**Date**: 2026-05-03
**Status**: Approved

## Overview

Four targeted upgrades to improve user retention, app performance, and developer confidence. No new features — tightening what exists.

## 1. Wire Brief Email Delivery via Resend

The brief publish endpoint creates BriefRecipient rows but never sends email. The weekly brief is the core retention feature for Pro subscribers.

**Changes:**
- After BriefRecipient rows are created in the publish transaction, call `resend.emails.send()` for each new recipient
- Set `sentAt` on each recipient only after Resend confirms delivery
- Email content: brief title, top movers with score deltas, narrative excerpt, "Read the full brief" CTA → `/briefs/[id]`
- Lazy Resend client singleton (same pattern as `lib/stripe.ts`)
- If `RESEND_API_KEY` not set, skip silently

**Files:**
- `apps/web/app/api/briefs/[id]/publish/route.ts` — add send loop after transaction
- `apps/web/lib/resend.ts` — new, lazy client singleton
- `apps/web/lib/brief-email.ts` — new, HTML email template function

## 2. Cache getPlan() with React.cache

`getPlan()` queries the User table on every call. Called 2-4 times per page load (layout + page component). `React.cache()` deduplicates within a single server request.

**Changes:**
- Wrap `getPlan` with `cache()` from React

**Files:**
- `apps/web/lib/plan.ts` — wrap export with `cache()`

## 3. Supabase Connection Pooling

Direct Postgres connections from Vercel serverless will exhaust the 60-connection limit at ~30 concurrent users.

**Changes:**
- Test Supabase transaction pooler (port 6543) — may now work with IPv4 enabled
- If pooler works: switch Vercel `DATABASE_URL` to pooler, add `DIRECT_URL` for migrations
- If pooler still fails: add `connection_limit=10` to direct URL as stopgap
- Add `directUrl` to Prisma datasource block

**Files:**
- `packages/db/prisma/schema.prisma` — add `directUrl = env("DIRECT_URL")`
- Vercel env vars — update DATABASE_URL, add DIRECT_URL

## 4. Remove typescript.ignoreBuildErrors

`next.config.ts` skips all TypeScript checking during builds. Type regressions ship silently.

**Changes:**
- Fix ~15 remaining type errors across adapter/agent packages
- Remove the `ignoreBuildErrors: true` flag
- Verify with `pnpm typecheck` before removing

**Files:**
- `apps/web/next.config.ts` — remove flag
- `packages/adapters/src/la-sos.ts` — optional chaining
- `packages/adapters/src/led-fastlane.ts` — nullish coalescing
- `packages/adapters/src/lpsc.ts` — optional chaining
- `packages/adapters/src/tceq.ts` — optional chaining
- `packages/adapters/src/usace-mvn.ts` — default values
- `packages/agents/src/entity-resolution.ts` — type narrowing
