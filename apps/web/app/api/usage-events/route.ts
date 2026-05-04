import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { requireUser } from "../_lib/require-user";

export const dynamic = "force-dynamic";

type UsageEventBody = {
  eventType?: string;
  surface?: string;
  targetType?: string;
  targetId?: string;
  metadata?: unknown;
};

export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as UsageEventBody | null;
  const eventType = body?.eventType?.trim();
  const surface = body?.surface?.trim();
  const targetType = body?.targetType?.trim() || null;
  const targetId = body?.targetId?.trim() || null;

  if (!eventType || !surface) {
    return NextResponse.json(
      { ok: false, error: "eventType and surface are required." },
      { status: 400 },
    );
  }

  await prisma.usageEvent.create({
    data: {
      eventType,
      surface,
      targetType,
      targetId,
      userId: gate.userId,
      metadata: body?.metadata ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
