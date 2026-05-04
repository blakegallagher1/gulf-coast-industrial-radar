import { NextResponse } from "next/server";
import { requireUser } from "../../_lib/require-user";
import { promoteCandidate } from "../_lib/promote-candidate";

export const dynamic = "force-dynamic";

type PromoteBody = {
  family?: string;
  label?: string;
  summary?: string;
};

export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as PromoteBody | null;
  const family = body?.family?.trim() ?? "";
  const label = body?.label?.trim() ?? "";
  const summary = body?.summary?.trim() ?? "";

  if (!family || !label) {
    return NextResponse.json({ ok: false, error: "family and label are required." }, { status: 400 });
  }

  try {
    const result = await promoteCandidate({
      family,
      label,
      summary,
      userId: gate.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not promote candidate.";
    const status = message.includes("No matching signals found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
