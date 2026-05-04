import Link from "next/link";
import { prisma } from "@gcir/db";
import { Radar, ArrowRight, Activity, Database, FileText, Bell, Map, Bookmark, ChevronRight } from "lucide-react";
import { EmailCapture } from "./landing-email-capture";

export const dynamic = "force-dynamic";

const VALIDATION_PROJECTS = [
  { name: "Hyundai Steel Donaldsonville", capex: "$5.8B", lead: "141d", parish: "Ascension, LA" },
  { name: "Woodside Louisiana LNG", capex: "$16B", lead: "340d", parish: "Calcasieu, LA" },
  { name: "Meta Richland Data Center", capex: "$10B", lead: "230d", parish: "Richland, LA" },
  { name: "Air Products Blue Ammonia", capex: "$4.5B", lead: "612d", parish: "Ascension, LA" },
  { name: "Rio Grande LNG", capex: "$18B", lead: "730d", parish: "Cameron, TX" },
];

const SIGNAL_FAMILIES = [
  { label: "Land Control", desc: "Parcel transfers, assembly patterns, series-LLC clustering, escrow agent reuse." },
  { label: "Environmental Permit", desc: "LDEQ, TCEQ, MDEQ, USACE 404 — NOIs and major-source filings." },
  { label: "Incentive", desc: "ITEP, JETI, LED FastLane — capex tier and parish disclosure." },
  { label: "Utility & Power", desc: "LPSC dockets, MISO queue, Entergy interconnection, FERC eLibrary." },
  { label: "Entity Formation", desc: "New LLCs, opaque project names, shared registered agents." },
  { label: "Port & Terminal", desc: "Lease items, dredging, terminal expansion on port-controlled tracts." },
  { label: "Public Company", desc: "10-K, 10-Q, 8-K — capex, FID, FEED, and named-site disclosures." },
  { label: "Local Agenda", desc: "Parish council packets, zoning, infrastructure, tax districts." },
  { label: "Financing", desc: "Bond Commission, EMMA, IDB authorizations, DOE LPO." },
  { label: "Procurement", desc: "SAM.gov, USAspending, public bids referencing a corridor." },
];

export default async function LandingPage() {
  const [projectCount, signalCount, sourceCount] = await Promise.all([
    prisma.project.count().catch(() => 0),
    prisma.signal.count().catch(() => 0),
    prisma.source.count({ where: { status: "ACTIVE" } }).catch(() => 0),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white/[0.08] ring-1 ring-white/[0.12]">
              <Radar className="h-3.5 w-3.5 text-[#10a37f]" strokeWidth={1.8} />
            </div>
            <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-white">
              Brick & Yield
            </span>
            <span className="ml-1 hidden rounded border border-[#10a37f]/30 bg-[#10a37f]/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-[#10a37f] sm:inline">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a href="#how" className="rounded-md px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white">How it works</a>
            <a href="#signals" className="rounded-md px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white">Signals</a>
            <a href="#proof" className="rounded-md px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white">Proof</a>
            <div className="mx-2 h-4 w-px bg-white/[0.12]" />
            <Link href={"/sign-in" as any} className="rounded-md px-3 py-1.5 text-[13px] text-white/50 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href={"/sign-up" as any}
              className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-4 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-white/90"
            >
              Get access
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
            backgroundSize: "72px 72px",
          }}
        />
        {/* Radial vignette */}
        <div className="pointer-events-none absolute inset-0 bg-radial-vignette" />

        <div className="animate-fade-up relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 text-[12.5px] font-medium text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10a37f] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10a37f]" />
            </span>
            {signalCount.toLocaleString()} signals ingested · {sourceCount} live sources
          </div>

          <h1 className="text-[52px] font-semibold leading-[1.07] tracking-[-0.03em] text-white sm:text-[64px]">
            Industrial intelligence<br />
            <span className="text-white/40">before the market does.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/50">
            Brick & Yield detects land assemblies, permit filings, entity formations, and
            capital signals across the Gulf Coast petrochemical corridor —
            early enough to act.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={"/sign-up" as any}
              className="group inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-[14px] font-semibold text-[#0a0a0a] transition-all hover:bg-white/90"
            >
              Get full access — free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/radar"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.12] px-6 text-[14px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
            >
              Open radar
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Live proof bar ───────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-white/[0.06] px-6 py-8">
          {[
            { value: projectCount, label: "Projects tracked", suffix: "" },
            { value: signalCount, label: "Signals archived", suffix: "" },
            { value: sourceCount, label: "Live public sources", suffix: "" },
          ].map((s) => (
            <div key={s.label} className="px-8 text-center first:pl-0 last:pr-0">
              <div className="font-mono text-[34px] font-semibold tracking-tight text-white">
                {s.value.toLocaleString()}{s.suffix}
              </div>
              <div className="mt-1 text-[12px] font-medium uppercase tracking-[0.08em] text-white/35">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-28">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#10a37f]">
          How it works
        </div>
        <h2 className="mb-16 max-w-xl text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          From raw source to investor-ready formation alert.
        </h2>

        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              icon: Database,
              title: "Ingest",
              desc: "10 public signal families scraped, parsed, and archived with full source provenance. Every claim links to its raw document.",
            },
            {
              step: "02",
              icon: Activity,
              title: "Score",
              desc: "Weighted composite across land control, permits, incentives, power, entities, and financing. Each contributor is visible.",
            },
            {
              step: "03",
              icon: Map,
              title: "Detect",
              desc: "Quiet Land Assembly Detector clusters spatial signals and fires formation alerts when pattern confidence crosses threshold.",
            },
            {
              step: "04",
              icon: Bell,
              title: "Act",
              desc: "Investor, developer, and engineering actions generated per alert. Save to watchlist. Receive in Monday brief.",
            },
          ].map((item) => (
            <div key={item.step} className="bg-[#0a0a0a] px-7 py-8">
              <div className="mb-5 flex items-start justify-between">
                <item.icon className="h-5 w-5 text-[#10a37f]" strokeWidth={1.6} />
                <span className="font-mono text-[12px] text-white/20">{item.step}</span>
              </div>
              <h3 className="mb-2 text-[16px] font-semibold tracking-tight">{item.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-white/45">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Signal taxonomy ──────────────────────────────────────────────── */}
      <section id="signals" className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#10a37f]">
            Signal taxonomy
          </div>
          <h2 className="mb-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
            Ten families. All public. All free.
          </h2>
          <p className="mb-14 max-w-lg text-[15px] leading-relaxed text-white/45">
            No paid aggregators, no proprietary databases. Every source is
            public and documented. Every claim links to its raw evidence with
            URL, observed date, and confidence.
          </p>

          <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
            {SIGNAL_FAMILIES.map((fam) => (
              <div key={fam.label} className="group bg-[#0d0d0d] px-6 py-5 transition-colors hover:bg-[#111]">
                <div className="flex items-start justify-between">
                  <div className="text-[14px] font-semibold tracking-tight text-white">
                    {fam.label}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/40">{fam.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform features ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-28">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#10a37f]">
          Platform
        </div>
        <h2 className="mb-14 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
          Everything unlocked. No restrictions.
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              icon: Map,
              title: "Interactive Radar",
              desc: "Scored projects on a live map. Filter by corridor, score band, and stage. Every pin opens a full evidence drawer.",
              badge: "Full access",
            },
            {
              icon: Bell,
              title: "Formation Alerts",
              desc: "Real-time notifications when quiet land assemblies, permits, or entity formations signal a project taking shape.",
              badge: "Full access",
            },
            {
              icon: FileText,
              title: "Weekly Briefs",
              desc: "Monday AI-generated analyst brief: top movers, new formations, recommended actions, source health.",
              badge: "Full access",
            },
            {
              icon: Bookmark,
              title: "Watchlists",
              desc: "Save custom corridor filters, track specific projects, share with your deal team.",
              badge: "Full access",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-7 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05]">
                  <f.icon className="h-5 w-5 text-[#10a37f]" strokeWidth={1.6} />
                </div>
                <span className="rounded-full border border-[#10a37f]/25 bg-[#10a37f]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#10a37f]">
                  {f.badge}
                </span>
              </div>
              <h3 className="mb-2 text-[16px] font-semibold tracking-tight">{f.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-white/45">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Backtest scoreboard ─────────────────────────────────────────── */}
      <section id="proof" className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#10a37f]">
            Proof
          </div>
          <h2 className="mb-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em]">
            Backtested against known projects.
          </h2>
          <p className="mb-12 max-w-lg text-[15px] leading-relaxed text-white/45">
            We ran the detector against public projects with known announcement
            dates. These are average lead times between first ingested signal
            and public announcement.
          </p>

          <div className="mb-8 grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-3">
            {[
              { label: "Avg lead time", value: "411d" },
              { label: "Longest lead", value: "730d" },
              { label: "Projects validated", value: "10" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0d0d0d] px-7 py-7">
                <div className="font-mono text-[32px] font-semibold tracking-tight">{s.value}</div>
                <div className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.07em] text-white/35">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.07]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  {["Project", "Capex", "Parish", "Lead time"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-white/35">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {VALIDATION_PROJECTS.map((p) => (
                  <tr key={p.name} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-medium text-white/80">{p.name}</td>
                    <td className="px-5 py-3.5 font-mono text-white/40">{p.capex}</td>
                    <td className="px-5 py-3.5 text-white/40">{p.parish}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded border border-[#10a37f]/25 bg-[#10a37f]/10 px-2 py-0.5 font-mono text-[12px] font-semibold text-[#10a37f]">
                        {p.lead}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Link href={"/proof" as any} className="flex items-center gap-1 text-[12.5px] font-medium text-white/35 transition-colors hover:text-white/60">
              Full proof report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Email capture ────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] px-6 py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-3 text-[30px] font-semibold tracking-[-0.025em]">
            Get a free sample brief
          </h2>
          <p className="mb-8 text-[14.5px] leading-relaxed text-white/45">
            See what a Brick & Yield weekly intelligence brief looks like —
            no account required.
          </p>
          <div className="flex justify-center">
            <EmailCapture dark />
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-28 text-center">
        <h2 className="mb-4 text-[36px] font-semibold tracking-[-0.025em]">
          Ready to see what&apos;s forming?
        </h2>
        <p className="mb-9 text-[16px] text-white/45">
          Full platform access for developers and investors. No credit card needed.
        </p>
        <Link
          href={"/sign-up" as any}
          className="group inline-flex h-12 items-center gap-2 rounded-lg bg-white px-8 text-[15px] font-semibold text-[#0a0a0a] transition-all hover:bg-white/90"
        >
          Get full access — free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-[13px] text-white/30">
            <Radar className="h-3.5 w-3.5" />
            <span>Brick & Yield</span>
            <span className="text-white/15">·</span>
            <span>brickandyield.com</span>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-white/30">
            <a href="mailto:blake@brickandyield.com" className="transition-colors hover:text-white/60">
              Contact
            </a>
            <Link href={"/sign-in" as any} className="transition-colors hover:text-white/60">
              Sign in
            </Link>
            <Link href="/radar" className="transition-colors hover:text-white/60">
              Open radar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
