import { NextResponse } from "next/server";
import { prisma } from "@gcir/db";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    await prisma.subscriber.upsert({
      where: { email: email.toLowerCase().trim() },
      create: { email: email.toLowerCase().trim(), source: "landing" },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
