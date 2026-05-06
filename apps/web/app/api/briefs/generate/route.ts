import { writeWeeklyBrief } from "@gcir/agents";
import { prisma } from "@gcir/db";
import { NextResponse } from "next/server";
import { requireUser } from "../../_lib/require-user";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;

export async function POST() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const end = new Date();
  const start = new Date(end.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const existing = await prisma.brief.findFirst({
    where: {
      windowStart: { lte: end },
      windowEnd: { gte: start },
    },
    orderBy: { issueNumber: "desc" },
    select: { id: true, issueNumber: true },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      briefId: existing.id,
      issueNumber: existing.issueNumber,
      reused: true,
    });
  }

  try {
    const out = await writeWeeklyBrief({ start, end });
    return NextResponse.json({ ok: true, ...out, reused: false });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
