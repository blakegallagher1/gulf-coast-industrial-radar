import { prisma } from "@gcir/db";

export type Plan = "free" | "pro";

export async function getPlan(clerkId: string | null): Promise<Plan> {
  if (!clerkId) return "free";

  const user = await prisma.user.findFirst({
    where: { clerkId },
    select: { plan: true, planExpiresAt: true },
  });

  if (!user) return "free";
  if (user.plan !== "pro") return "free";

  if (user.planExpiresAt && user.planExpiresAt < new Date()) {
    return "free";
  }

  return "pro";
}
