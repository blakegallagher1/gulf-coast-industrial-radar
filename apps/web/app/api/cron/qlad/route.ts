import { NextResponse } from "next/server";
import { tickQlad } from "../../../../../worker/src/jobs/qlad-evaluate";
import { verifyCronAuthorization } from "@/lib/cron-auth";

/**
 * Cron-callable endpoint — invokes the live Quiet Land Assembly Detector pass.
 * Use Vercel Cron or any scheduler with Authorization: Bearer HEALTHCHECK_TOKEN.
 */
export async function POST(req: Request) {
  const authFailure = verifyCronAuthorization(req);
  if (authFailure) return authFailure;

  try {
    const result = await tickQlad();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST to trigger a QLAD tick." });
}
