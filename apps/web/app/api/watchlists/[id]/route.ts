import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { requireUser } from "../../_lib/require-user";

type WatchlistMetaBody = {
  followed?: boolean;
  deliveryMode?: "weekly_brief" | "manual";
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as WatchlistMetaBody | null;

  const existing = await prisma.watchlist.findUnique({
    where: { id },
    select: { id: true, filter: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Watchlist not found." }, { status: 404 });
  }

  if (gate.userId && existing.userId && existing.userId !== gate.userId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const currentFilter =
    existing.filter && typeof existing.filter === "object" && !Array.isArray(existing.filter)
      ? (existing.filter as Record<string, unknown>)
      : {};

  const nextFilter = {
    ...currentFilter,
    followed: body?.followed ?? false,
    deliveryMode: body?.deliveryMode ?? "manual",
  };

  await prisma.watchlist.update({
    where: { id },
    data: { filter: nextFilter },
  });

  return NextResponse.json({
    ok: true,
    watchlistId: id,
    followed: nextFilter.followed,
    deliveryMode: nextFilter.deliveryMode,
  });
}
