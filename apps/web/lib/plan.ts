// Feature gates temporarily removed — all users have full access.
// Re-enable free/pro gating when subscription enforcement is ready.

export type Plan = "free" | "pro";

export const getPlan = async (_clerkId: string | null): Promise<Plan> => {
  return "pro";
};
