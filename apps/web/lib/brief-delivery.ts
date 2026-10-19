import type { DatabaseUserIdentity } from "@/app/api/_lib/require-user";

const OPERATOR_ROLES = new Set(["admin", "operator"]);

export function canViewBriefRecipientDetails(
  user: Pick<DatabaseUserIdentity, "role" | "developmentBypass"> | null,
): boolean {
  if (!user) return false;
  return user.developmentBypass || OPERATOR_ROLES.has(user.role.trim().toLowerCase());
}
