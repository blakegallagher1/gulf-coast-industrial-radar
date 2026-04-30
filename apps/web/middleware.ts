/**
 * apps/web/middleware.ts — Clerk middleware.
 *
 * Note: gpc-cres uses the file name `proxy.ts` (Roux convention, requires a
 * custom Next config). This scaffold uses `middleware.ts` because Next.js 16
 * auto-detects that exact filename. Rename + add config later if you want
 * to converge on the Roux naming.
 *
 * Public routes: marketing landing, sign-in, sign-up, health, cron endpoints.
 * Everything else is gated through Clerk.
 *
 * Dev bypass: NEXT_PUBLIC_DISABLE_AUTH=true is honored only when
 * NODE_ENV !== "production" OR NEXT_PUBLIC_E2E === "true".
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/cron/(.*)",
]);

const allowDevBypass =
  process.env.NEXT_PUBLIC_DISABLE_AUTH === "true" &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "true");

export default clerkMiddleware(async (auth, req) => {
  if (allowDevBypass) return NextResponse.next();
  if (isPublic(req)) return NextResponse.next();
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip static files and the Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
