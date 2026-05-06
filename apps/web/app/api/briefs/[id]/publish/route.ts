import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { requireUser } from "../../../_lib/require-user";
import { sendEmail } from "@/lib/resend";
import { renderBriefEmail } from "@/lib/brief-email";

type PublishBody = {
  emails?: string[];
};

function normalizeEmails(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 3 && value.includes("@")),
    ),
  );
}

async function loadFollowedWatchlistEmails(): Promise<string[]> {
  const watchlists = await prisma.watchlist.findMany({
    where: {
      AND: [
        { filter: { path: ["followed"], equals: true } },
        { filter: { path: ["deliveryMode"], equals: "weekly_brief" } },
      ],
      userId: { not: null },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return Array.from(
    new Set(
      watchlists
        .map((watchlist) => watchlist.user?.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email && email.includes("@"))),
    ),
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as PublishBody | null;
  const manualEmails = normalizeEmails(body?.emails);
  const followerEmails = await loadFollowedWatchlistEmails();
  const emails = Array.from(new Set([...manualEmails, ...followerEmails]));

  const brief = await prisma.brief.findUnique({
    where: { id },
    select: { id: true, publishedAt: true },
  });

  if (!brief) {
    return NextResponse.json({ ok: false, error: "Brief not found." }, { status: 404 });
  }

  const publishedAt = brief.publishedAt ?? new Date();
  const existingRecipients = emails.length
    ? await prisma.briefRecipient.findMany({
        where: { briefId: id, email: { in: emails } },
        select: { email: true },
      })
    : [];
  const existingEmailSet = new Set(
    existingRecipients
      .map((recipient) => recipient.email)
      .filter((value): value is string => Boolean(value)),
  );
  const newEmails = emails.filter((email) => !existingEmailSet.has(email));

  await prisma.$transaction([
    prisma.brief.update({
      where: { id },
      data: { publishedAt },
    }),
    ...newEmails.map((email) =>
      prisma.briefRecipient.create({
        data: {
          briefId: id,
          email,
          sentAt: null,
        },
      }),
    ),
  ]);

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

  return NextResponse.json({
    ok: true,
    publishedAt: publishedAt.toISOString(),
    queuedRecipients: newEmails.length,
    followedWatchlistRecipients: followerEmails.length,
  });
}
