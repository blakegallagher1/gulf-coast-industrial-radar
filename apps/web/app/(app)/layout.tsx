import { Topbar } from "@/components/topbar";
import { prisma } from "@gcir/db";
import { auth } from "@clerk/nextjs/server";
import { getPlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [watchlistCount, session] = await Promise.all([
    prisma.watchlist.count().catch(() => 0),
    auth().catch(() => null),
  ]);
  const plan = await getPlan(session?.userId ?? null);

  return (
    <div className="flex h-screen flex-col">
      <Topbar watchlistCount={watchlistCount} plan={plan} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
