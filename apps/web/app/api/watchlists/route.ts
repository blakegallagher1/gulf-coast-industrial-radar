import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { requireUser } from "../_lib/require-user";

export const dynamic = "force-dynamic";

type CreateWatchlistBody = {
  projectId?: string;
  name?: string;
  description?: string;
  isShared?: boolean;
  filter?: {
    corridors?: string[];
    scoreBands?: string[];
    alertCount?: number;
    projectIds?: string[];
  };
};

export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as CreateWatchlistBody | null;
  const projectId = body?.projectId?.trim();
  const filter = body?.filter;

  if (filter) {
    const projectIds = Array.isArray(filter.projectIds)
      ? Array.from(
          new Set(
            filter.projectIds.filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            ),
          ),
        )
      : [];

    const name = body?.name?.trim() || "Shared radar watchlist";
    const description =
      body?.description?.trim() ||
      `${filter.alertCount ?? projectIds.length} alerts in current radar view`;

    const watchlist = await prisma.watchlist.create({
      data: {
        name,
        description,
        isShared: body?.isShared !== false,
        filter: {
          corridors: Array.isArray(filter.corridors) ? filter.corridors : [],
          scoreBands: Array.isArray(filter.scoreBands) ? filter.scoreBands : [],
          alertCount: filter.alertCount ?? projectIds.length,
          projectIds,
        },
        items:
          projectIds.length > 0
            ? {
                create: projectIds.map((id) => ({
                  projectId: id,
                })),
              }
            : undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      watchlistId: watchlist.id,
    });
  }

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "projectId is required." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      publicId: true,
      name: true,
      stage: true,
      score: true,
      parishCounty: true,
      state: true,
      facilityType: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  const name = body?.name?.trim() || `${project.name} watchlist`;
  const description =
    body?.description?.trim() ||
    [
      `Started from ${project.publicId}`,
      project.parishCounty,
      project.facilityType,
      `stage ${project.stage.toLowerCase().replace(/_/g, "-")}`,
      `score ${project.score}`,
    ]
      .filter(Boolean)
      .join(" · ");
  const isShared = body?.isShared === true;

  const existingWatchlist = await prisma.watchlist.findFirst({
    where: {
      userId: gate.userId ?? null,
      name,
      isShared,
      items: {
        some: {
          projectId: project.id,
        },
      },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (existingWatchlist) {
    return NextResponse.json({
      ok: true,
      watchlistId: existingWatchlist.id,
    });
  }

  const watchlist = await prisma.watchlist.create({
    data: {
      userId: gate.userId,
      name,
      description,
      isShared,
      filter: {
        projectIds: [project.id],
        stages: [project.stage],
        followed: true,
        deliveryMode: "weekly_brief",
        geography: {
          parishCounty: project.parishCounty,
          state: project.state,
        },
      },
      items: {
        create: {
          projectId: project.id,
          pinned: true,
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    watchlistId: watchlist.id,
  });
}
