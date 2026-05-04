import { Topbar } from "@/components/topbar";
import { prisma } from "@gcir/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const watchlistCount = await prisma.watchlist.count().catch(() => 0);
  const plan = "pro" as const;

  return (
    <div className="flex h-screen flex-col">
      <Topbar watchlistCount={watchlistCount} plan={plan} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
