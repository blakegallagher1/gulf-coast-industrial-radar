import { NextResponse } from "next/server";
import { requireUser } from "../../_lib/require-user";
import { tickQlad } from "../../../../../worker/src/jobs/qlad-evaluate";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

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
