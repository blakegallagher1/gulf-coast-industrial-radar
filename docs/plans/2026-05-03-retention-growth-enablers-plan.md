# Retention & Growth Enablers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Four targeted upgrades to improve retention (brief emails), performance (getPlan cache), scalability (connection pooling), and developer confidence (type safety).

**Architecture:** All changes are surgical — no new features, no refactors. Brief email uses the existing Resend HTTP API pattern from budget-report.ts. getPlan caching uses React.cache for request-level dedup. Connection pooling adds directUrl to Prisma datasource. Type fixes are narrow optional-chaining additions.

**Tech Stack:** Next.js 16, Prisma 6, Resend (HTTP API, no SDK), React.cache, Supabase PostgreSQL

---

### Task 1: Create Resend Client Singleton

**Files:**
- Create: `apps/web/lib/resend.ts`

**Step 1: Create the lazy Resend helper**

Same pattern as `apps/web/lib/stripe.ts` — lazy init, direct fetch (no SDK, matching the budget-report.ts pattern).

```typescript
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.BRIEF_FROM_EMAIL ??
  "Gulf Coast Industrial Radar <radar@gallagherpropco.com>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  return res.ok;
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/resend.ts
git commit -m "feat: add Resend email helper (lazy, no SDK)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create Brief Email Template

**Files:**
- Create: `apps/web/lib/brief-email.ts`

**Step 1: Create the email template function**

Generates an HTML email for a published brief. Matches the budget-report.ts email style.

```typescript
export function renderBriefEmail({
  briefId,
  title,
  topMovers,
  narrative,
  appUrl,
}: {
  briefId: string;
  title: string;
  topMovers: { name?: string; scoreDelta?: number; delta?: number }[];
  narrative: string;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `[GCIR] ${title}`;

  const moversHtml = topMovers
    .slice(0, 5)
    .map((m) => {
      const delta = m.scoreDelta ?? m.delta ?? 0;
      const sign = delta > 0 ? "+" : "";
      const color = delta > 0 ? "#b3261e" : "#10a37f";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(m.name ?? "—")}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:${color}">${sign}${delta}</td>
      </tr>`;
    })
    .join("");

  const briefUrl = `${appUrl}/briefs/${briefId}`;
  const excerptText = narrative.length > 300 ? narrative.slice(0, 300) + "..." : narrative;

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
  <div style="margin-bottom:18px">
    <div style="font-size:12px;color:#666;letter-spacing:0.04em;text-transform:uppercase;font-weight:600">Weekly Intelligence Brief</div>
    <div style="font-size:22px;font-weight:600;margin-top:4px;line-height:1.3">${escapeHtml(title)}</div>
  </div>
  ${moversHtml ? `<p style="margin:0 0 6px;font-size:12px;color:#666;letter-spacing:0.04em;text-transform:uppercase;font-weight:600">Top movers</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px">
    <thead><tr>
      <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Project</th>
      <th style="text-align:right;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Score delta</th>
    </tr></thead>
    <tbody>${moversHtml}</tbody>
  </table>` : ""}
  <p style="font-size:14px;line-height:1.6;color:#333;margin-bottom:24px">${escapeHtml(excerptText)}</p>
  <a href="${briefUrl}" style="display:inline-block;background:#0d0d0d;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Read the full brief</a>
  <p style="font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:12px">
    Gulf Coast Industrial Radar · gulfcoastradar.com
  </p>
</body></html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/brief-email.ts
git commit -m "feat: add brief email HTML template

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Wire Email Sending into Brief Publish Route

**Files:**
- Modify: `apps/web/app/api/briefs/[id]/publish/route.ts`

**Step 1: Add email sending after the transaction**

After the `$transaction` block (line 68), add a loop that:
1. Fetches the full brief (title, narrative, topMovers)
2. Renders the email template
3. Sends to each new recipient
4. Updates `sentAt` on each successful send

Add these imports at the top:
```typescript
import { sendEmail } from "@/lib/resend";
import { renderBriefEmail } from "@/lib/brief-email";
```

After the transaction (after line 68), before the return, add:

```typescript
  if (newEmails.length > 0) {
    const fullBrief = await prisma.brief.findUnique({
      where: { id },
      select: { title: true, narrative: true, topMovers: true },
    });

    if (fullBrief) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://gulf-coast-industrial-radar.vercel.app";
      const movers = (fullBrief.topMovers as any[]) ?? [];
      const { subject, html } = renderBriefEmail({
        briefId: id,
        title: fullBrief.title,
        topMovers: movers,
        narrative: fullBrief.narrative,
        appUrl,
      });

      for (const email of newEmails) {
        const sent = await sendEmail({ to: email, subject, html });
        if (sent) {
          await prisma.briefRecipient.updateMany({
            where: { briefId: id, email },
            data: { sentAt: new Date() },
          });
        }
      }
    }
  }
```

**Step 2: Commit**

```bash
git add apps/web/app/api/briefs/\[id\]/publish/route.ts
git commit -m "feat: send brief emails via Resend on publish

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Cache getPlan() with React.cache

**Files:**
- Modify: `apps/web/lib/plan.ts`

**Step 1: Wrap with React.cache**

Replace the entire file content:

```typescript
import { cache } from "react";
import { prisma } from "@gcir/db";

export type Plan = "free" | "pro";

export const getPlan = cache(async (clerkId: string | null): Promise<Plan> => {
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
});
```

**Step 2: Commit**

```bash
git add apps/web/lib/plan.ts
git commit -m "perf: cache getPlan() per request with React.cache

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Add directUrl to Prisma Datasource

**Files:**
- Modify: `packages/db/prisma/schema.prisma:12-15`

**Step 1: Add directUrl**

Replace the datasource block (lines 12-15):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Step 2: Regenerate Prisma client**

Run: `cd packages/db && npx prisma generate`

**Step 3: Test pooler connection**

Now that IPv4 is enabled, test the pooler again:
```bash
PGPASSWORD='RKxR@Uo.y2gJp.73zq3y' psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 -U postgres.imgobphnhwkpilbmxdny -d postgres -c "SELECT 1"
```

If pooler works: set Vercel `DATABASE_URL` to the pooler string and `DIRECT_URL` to the direct string.
If pooler still fails: add `&connection_limit=10` to the existing direct `DATABASE_URL` and set `DIRECT_URL` to the same value.

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): add directUrl for Prisma migration support

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Fix Type Errors — Adapters

**Files:**
- Modify: `packages/adapters/src/la-sos.ts:111,114`
- Modify: `packages/adapters/src/led-fastlane.ts:84,120,123`
- Modify: `packages/adapters/src/lpsc.ts:83`
- Modify: `packages/adapters/src/tceq.ts:93`
- Modify: `packages/adapters/src/usace-mvn.ts:75-77`

**Step 1: Fix each file**

Read each file at the error line, then apply the minimal fix:

- `la-sos.ts:111` — `tableMatch[1]` may be undefined. Add `if (!tableMatch?.[1]) return [];` guard before line 111.
- `led-fastlane.ts:84` — argument `string | undefined` to `string` param. Add `?? ""` or `!` where the value is known to exist from prior checks.
- `led-fastlane.ts:120,123` — same pattern, add optional chaining or nullish coalescing.
- `lpsc.ts:83` — "Object is possibly undefined". Add `?.` to the chain.
- `tceq.ts:93` — same pattern, add `?.`.
- `usace-mvn.ts:75-77` — `externalId` and `url` are `string | undefined` but `AdapterRecord` requires `string`. Add `?? ""` defaults or filter out records with missing IDs.

**Step 2: Verify**

Run: `pnpm --filter @gcir/web typecheck 2>&1 | grep "packages/adapters"`

Expected: No errors from adapters.

**Step 3: Commit**

```bash
git add packages/adapters/src/la-sos.ts packages/adapters/src/led-fastlane.ts packages/adapters/src/lpsc.ts packages/adapters/src/tceq.ts packages/adapters/src/usace-mvn.ts
git commit -m "fix: resolve TypeScript strict errors in adapters

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Fix Type Errors — Entity Resolution

**Files:**
- Modify: `packages/agents/src/entity-resolution.ts:81`

**Step 1: Fix the EntityLink create type**

Read line 81. The `fromId` and `toId` are `string | undefined`. Add a guard:

```typescript
if (!link.fromId || !link.toId) continue;
```

before the `prisma.entityLink.upsert` call. This filters out links with missing IDs.

**Step 2: Verify**

Run: `pnpm --filter @gcir/web typecheck 2>&1 | grep "entity-resolution"`

Expected: No errors.

**Step 3: Commit**

```bash
git add packages/agents/src/entity-resolution.ts
git commit -m "fix: guard against undefined entity IDs in resolution agent

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Remove ignoreBuildErrors

**Files:**
- Modify: `apps/web/next.config.ts:18-20`

**Step 1: Verify zero type errors**

Run: `pnpm --filter @gcir/web typecheck`

Expected: Clean — no errors. If any remain, fix them before proceeding.

**Step 2: Remove the flag**

In `apps/web/next.config.ts`, delete lines 18-20:

```typescript
  typescript: {
    ignoreBuildErrors: true,
  },
```

**Step 3: Verify build passes**

Run: `pnpm --filter @gcir/web build`

Expected: Build succeeds with TypeScript checking enabled.

**Step 4: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "fix: remove ignoreBuildErrors — all type errors resolved

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Final Verification

**Step 1: Full typecheck**

Run: `pnpm --filter @gcir/web typecheck`
Expected: Clean.

**Step 2: Full build**

Run: `pnpm --filter @gcir/web build`
Expected: Build succeeds.

**Step 3: Deploy**

Run: `npx vercel --prod`
Expected: Deployment completes and is Ready.

**Step 4: Verify health**

Run: `curl -s https://gulf-coast-industrial-radar.vercel.app/api/health`
Expected: `{"ok":true,...}`
