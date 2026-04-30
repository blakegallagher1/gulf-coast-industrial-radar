import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      signals: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      alerts: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latestAlert = project.alerts[0] ?? null;

  return NextResponse.json({
    ...project,
    latestAlert,
  });
}
