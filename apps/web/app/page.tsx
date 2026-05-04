import Link from "next/link";
import { prisma } from "@gcir/db";
import {
  Radar,
  Bell,
  FileText,
  Bookmark,
  CheckCircle,
  Shield,
  Map,
} from "lucide-react";
import { EmailCapture } from "./landing-email-capture";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [projectCount, signalCount, sourceCount] = await Promise.all([
    prisma.project.count().catch(() => 0),
    prisma.signal.count().catch(() => 0),
    prisma.source.count({ where: { status: "ACTIVE" } }).catch(() => 0),
  ]);

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5 font-semibold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-white/20 to-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
            <Radar className="h-3.5 w-3.5" strokeWidth={1.6} />
          </div>
          <span className="text-[14px]">Gulf Coast Industrial Radar</span>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <a href="#features" className="text-stone-400 transition-colors hover:text-white">Features</a>
          <Link href={"/sign-in" as any} className="text-stone-400 transition-colors hover:text-white">Sign In</Link>
          <Link
            href={"/sign-up" as any}
            className="rounded-lg bg-white/10 px-4 py-1.5 font-medium text-white transition-colors hover:bg-white/20"
          >
            Get Access
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <h1 className="mx-auto max-w-3xl text-[48px] font-semibold leading-[1.1] tracking-tighter">
          See industrial projects forming{" "}
          <span className="text-accent">before the market does.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-stone-400">
          Gulf Coast Industrial Radar detects land assemblies, permit filings, entity formations, and capital signals across the Louisiana-Texas petrochemical corridor — early enough to act.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href={"/sign-up" as any}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-ink"
          >
            Get Full Access — Free
          </Link>
          <Link
            href="/radar"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-700 px-6 text-[14px] font-medium text-white transition-colors hover:bg-white/5"
          >
            Open Radar
          </Link>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-stone-800 bg-stone-900/50">
        <div className="mx-auto flex max-w-4xl divide-x divide-stone-800 px-6 py-6">
          <div className="flex-1 text-center">
            <div className="font-mono text-[28px] font-semibold tracking-tight text-white">{projectCount}</div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-stone-500">Projects tracked</div>
          </div>
          <div className="flex-1 text-center">
            <div className="font-mono text-[28px] font-semibold tracking-tight text-white">{signalCount.toLocaleString()}</div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-stone-500">Signals processed</div>
          </div>
          <div className="flex-1 text-center">
            <div className="font-mono text-[28px] font-semibold tracking-tight text-white">{sourceCount}</div>
            <div className="text-[12px] font-medium uppercase tracking-wider text-stone-500">Live sources</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-3 text-center text-[12px] font-semibold uppercase tracking-wider text-accent">
          Intelligence Platform
        </h2>
        <p className="mb-14 text-center text-[28px] font-semibold tracking-tight">
          Every tool. Full access. No restrictions.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Map,
              title: "Interactive Radar",
              desc: "Scored industrial projects plotted on a live map. Filter by corridor, score band, and stage. Click any pin for deep project intelligence.",
            },
            {
              icon: Bell,
              title: "Formation Alerts",
              desc: "Real-time notifications when quiet land assemblies, new permits, or entity formations signal a project is taking shape.",
            },
            {
              icon: FileText,
              title: "Weekly Briefs",
              desc: "Every Monday, an AI-generated analyst brief covers top movers, new formations, recommended actions, and source health.",
            },
            {
              icon: Bookmark,
              title: "Watchlists",
              desc: "Save custom filters, track specific projects across corridors, and get alerted when your watchlist changes.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-stone-800 bg-stone-900/50 p-7"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mb-2 text-[16px] font-semibold">{f.title}</h3>
              <p className="mb-3 text-[13.5px] leading-relaxed text-stone-400">
                {f.desc}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 px-2 py-0.5 text-[11px] font-medium text-accent">
                <CheckCircle className="h-3 w-3 text-accent" /> Included
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Access section */}
      <section id="access" className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-accent">
          Access
        </h2>
        <p className="mb-6 text-[28px] font-semibold tracking-tight">
          Full platform access for developers &amp; investors
        </p>
        <p className="mb-10 text-[15px] leading-relaxed text-stone-400">
          Everything is unlocked — the full project drawer, formation alerts, AI weekly briefs, watchlists, entity graphs, evidence archive, and recommended actions. Sign up and start tracking the Gulf Coast corridor today.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href={"/sign-up" as any}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-ink"
          >
            Get Full Access
          </Link>
          <Link
            href="/radar"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-stone-700 px-6 text-[14px] font-medium text-white transition-colors hover:bg-white/5"
          >
            Open Radar
          </Link>
        </div>
      </section>

      {/* Email capture */}
      <section className="border-t border-stone-800 bg-stone-900/50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Shield className="mx-auto mb-4 h-8 w-8 text-stone-600" />
          <h2 className="mb-2 text-[20px] font-semibold">Get a free sample brief</h2>
          <p className="mb-6 text-[13.5px] text-stone-400">
            See what a GCIR weekly intelligence brief looks like — no account needed.
          </p>
          <div className="flex justify-center">
            <EmailCapture />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-[13px] text-stone-500">
            <Radar className="h-3.5 w-3.5" />
            Gulf Coast Industrial Radar
            <span className="text-stone-700">·</span>
            brickandyield.com
          </div>
          <div className="flex items-center gap-4 text-[12.5px] text-stone-500">
            <a href="mailto:blake@brickandyield.com" className="hover:text-stone-300">Contact</a>
            <Link href={"/sign-in" as any} className="hover:text-stone-300">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
