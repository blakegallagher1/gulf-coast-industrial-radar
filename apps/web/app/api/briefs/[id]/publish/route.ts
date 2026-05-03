import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";
import { requireUser } from "../../../_lib/require-user";

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as PublishBody | null;
  const emails = normalizeEmails(body?.emails);

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

  return NextResponse.json({
    ok: true,
    publishedAt: publishedAt.toISOString(),
    queuedRecipients: newEmails.length,
  });
}
