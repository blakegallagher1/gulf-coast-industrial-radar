import { NextResponse } from "next/server";
import { AnalystState } from "@gcir/db";
import { prisma } from "@gcir/db";
import { setReviewState } from "@gcir/agents";
import { requireUser } from "../../../_lib/require-user";

const ALLOWED_STATES = new Set<AnalystState>([
  AnalystState.WATCH,
  AnalystState.ESCALATED,
  AnalystState.VALID,
  AnalystState.FALSE_POSITIVE,
  AnalystState.DISMISSED,
]);

type ReviewBody = {
  state?: AnalystState;
  note?: string;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reviews = await prisma.analystReview.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      state: true,
      note: true,
      createdAt: true,
      reviewerId: true,
    },
  });

  return NextResponse.json({
    reviews: reviews.map((review) => ({
      id: review.id,
      state: review.state,
      note: review.note,
      createdAt: review.createdAt,
      reviewerId: review.reviewerId,
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as ReviewBody | null;
  const state = body?.state;
  const note = body?.note?.trim();

  if (!state || !ALLOWED_STATES.has(state)) {
    return NextResponse.json(
      { ok: false, error: "Valid review state is required." },
      { status: 400 },
    );
  }

  await setReviewState(id, state, gate.userId ?? undefined, note);

  return NextResponse.json({ ok: true });
}
