import Link from "next/link";
import { prisma } from "@gcir/db";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { EmailCapture } from "./landing-email-capture";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
   "The Pilot House" landing — industrial-intelligence operating console.
   The page is staged like a marine chart: nav sits above a horizon rule,
   the hero opens with a typographic manifesto, and the rest of the page
   reads like a captain's log of evidence and provenance.
   ────────────────────────────────────────────────────────────────────────── */

const VALIDATION_PROJECTS = [
  { name: "Hyundai Steel — Donaldsonville",   capex: "$5.8B", lead: "141d",  parish: "Ascension, LA",   coords: "30.1014°N · 90.9879°W" },
  { name: "Woodside — Louisiana LNG",          capex: "$16.0B", lead: "340d", parish: "Calcasieu, LA",   coords: "30.1819°N · 93.3173°W" },
  { name: "Meta — Richland Data Center",       capex: "$10.0B", lead: "230d", parish: "Richland, LA",    coords: "32.4126°N · 91.7440°W" },
  { name: "Air Products — Blue Ammonia",       capex: "$4.5B",  lead: "612d", parish: "Ascension, LA",   coords: "30.1014°N · 90.9879°W" },
  { name: "NextDecade — Rio Grande LNG",       capex: "$18.0B", lead: "730d", parish: "Cameron, TX",     coords: "26.0723°N · 97.1675°W" },
];

const SIGNAL_FAMILIES = [
  { code: "01", label: "Land control",        weight: 25, desc: "Parcel transfers, contiguous assembly, series-LLC clustering, escrow re-use." },
  { code: "02", label: "Environmental permit", weight: 15, desc: "LDEQ · TCEQ · MDEQ · USACE 404. NOIs and major-source filings." },
  { code: "03", label: "Incentive",            weight: 15, desc: "ITEP · JETI · LED FastLane — capex tier and parish disclosure." },
  { code: "04", label: "Utility & power",      weight: 15, desc: "LPSC dockets · MISO queue · Entergy interconnection · FERC eLibrary." },
  { code: "05", label: "Entity formation",     weight: 10, desc: "Newly minted LLCs, opaque project names, shared registered agents." },
  { code: "06", label: "Port & terminal",      weight:  8, desc: "Port-controlled lease items, dredging, terminal-expansion options." },
  { code: "07", label: "Local agenda",         weight:  8, desc: "Parish-council packets, zoning, infrastructure, tax districts." },
  { code: "08", label: "Public company",       weight:  7, desc: "10-K · 10-Q · 8-K — capex, FID, FEED, named-site disclosures." },
  { code: "09", label: "Financing",            weight:  7, desc: "Bond Commission · EMMA · IDB authorizations · DOE LPO." },
  { code: "10", label: "Procurement",          weight:  5, desc: "SAM.gov · USAspending · public bids referencing a corridor." },
];

/* The four-step operating loop */
const PIPELINE = [
  { step: "I",   title: "Ingest",  desc: "Ten free public-source families, scraped, parsed, archived. Every claim links to its raw document." },
  { step: "II",  title: "Score",   desc: "Weighted composite over land, permit, power, capital. Each contributor stays inspectable." },
  { step: "III", title: "Detect",  desc: "Quiet Land Assembly Detector clusters spatial signals; alerts fire when pattern confidence trips." },
  { step: "IV",  title: "Act",     desc: "Investor, developer, engineering, and construction moves generated per alert. Save. Brief. Forward." },
];

export default async function LandingPage() {
  const [projectCount, signalCount, sourceCount] = await Promise.all([
    prisma.project.count().catch(() => 0),
    prisma.signal.count().catch(() => 0),
    prisma.source.count({ where: { status: "ACTIVE" } }).catch(() => 0),
  ]);

  return (
    <div className="min-h-screen bg-[#0c100e] text-bone selection:bg-[#e9a539] selection:text-[#0c100e]">

      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#0c100e]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-6 px-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[19px] leading-none tracking-[-0.01em] text-bone">
                Brick &amp; Yield
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-bone/40">
                est. 26
              </span>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <a href="#operating-loop" className="rounded px-3 py-1.5 text-[12.5px] font-medium uppercase tracking-[0.10em] text-bone/55 transition-colors hover:text-bone">Loop</a>
            <a href="#signals"        className="rounded px-3 py-1.5 text-[12.5px] font-medium uppercase tracking-[0.10em] text-bone/55 transition-colors hover:text-bone">Signals</a>
            <a href="#proof"          className="rounded px-3 py-1.5 text-[12.5px] font-medium uppercase tracking-[0.10em] text-bone/55 transition-colors hover:text-bone">Proof</a>
            <a href="#manifesto"      className="rounded px-3 py-1.5 text-[12.5px] font-medium uppercase tracking-[0.10em] text-bone/55 transition-colors hover:text-bone">Manifesto</a>
            <div className="mx-2 h-4 w-px bg-bone/15" />
            <Link href={"/sign-in" as any} className="rounded px-3 py-1.5 text-[12.5px] font-medium uppercase tracking-[0.10em] text-bone/55 transition-colors hover:text-bone">
              Sign in
            </Link>
            <Link
              href={"/sign-up" as any}
              className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#e9a539] px-3.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0c100e] transition-all hover:bg-[#f4b94f] hover:shadow-[0_0_0_1px_#e9a539,0_8px_24px_rgba(233,165,57,0.36)]"
            >
              Get access
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero — typographic manifesto ────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Blueprint grid */}
        <div className="gcir-blueprint-dark pointer-events-none absolute inset-0" />
        {/* Radar sweep */}
        <div className="pointer-events-none absolute left-1/2 top-[40%] aspect-square w-[1200px] -translate-x-1/2 -translate-y-1/2 opacity-50">
          <div className="gcir-sweep absolute inset-0 rounded-full" />
          <div className="absolute inset-[8%] rounded-full border border-bone/[0.05]" />
          <div className="absolute inset-[20%] rounded-full border border-bone/[0.05]" />
          <div className="absolute inset-[34%] rounded-full border border-bone/[0.05]" />
          <div className="absolute inset-[50%] rounded-full border border-[#e9a539]/[0.10]" />
        </div>
        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 bg-radial-vignette" />
        {/* Scan lines */}
        <div className="gcir-scanlines pointer-events-none absolute inset-0 opacity-50" />

        {/* Top hairline + coordinate strip */}
        <div className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between px-6 pt-24">
          <span className="gcir-coord text-bone/40">N 30°06′ · W 91°10′</span>
          <span className="gcir-coord text-bone/40">Bearing 287° · Sweep 0.6 Hz</span>
        </div>

        <div className="relative z-10 mx-auto max-w-[1180px] px-6 pb-32 pt-12">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-9">
              {/* Live status badge */}
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-bone/[0.10] bg-bone/[0.03] py-1.5 pl-3 pr-4 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#7dd6a3] gcir-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7dd6a3]" />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bone/55">
                  Live · {signalCount.toLocaleString()} signals · {sourceCount} public sources
                </span>
              </div>

              {/* Manifesto headline — mixed serif & sans */}
              <h1 className="font-display text-[88px] font-normal leading-[0.92] tracking-[-0.03em] text-bone sm:text-[132px]">
                We see the
                <span className="relative inline-block px-3 mx-1 italic text-[#e9a539]">
                  formation
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#e9a539]/40" />
                </span>
                <br />
                <span className="text-bone/45">before the announcement.</span>
              </h1>

              <p className="mt-10 max-w-[640px] font-sans text-[18px] leading-[1.55] text-bone/55">
                Brick &amp; Yield is the operating console for Gulf Coast industrial intelligence.
                Land assemblies, permit filings, entity formations, capital signals — clustered,
                scored, and surfaced as actionable formation alerts <em className="text-bone/75 not-italic font-medium">months</em> before the press release.
              </p>

              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link
                  href={"/sign-up" as any}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-[4px] bg-bone px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0c100e] transition-all hover:bg-[#e9a539] hover:shadow-[0_0_0_1px_#e9a539,0_12px_32px_rgba(233,165,57,0.35)]"
                >
                  Open the radar — free
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
                </Link>
                <Link
                  href="/radar"
                  className="inline-flex h-12 items-center gap-2 rounded-[4px] border border-bone/15 px-6 text-[13px] font-medium uppercase tracking-[0.08em] text-bone/75 transition-all hover:border-[#e9a539]/60 hover:text-bone"
                >
                  Watch a corridor
                </Link>
              </div>
            </div>

            {/* Right column: Bearing readout */}
            <aside className="col-span-12 lg:col-span-3">
              <div className="relative h-full rounded-[7px] border border-bone/[0.10] bg-[#0c100e]/60 p-5 backdrop-blur-sm">
                <div className="gcir-scan-bar" />
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-bone/45">
                  Operations log
                </div>
                <div className="mt-4 space-y-3 font-mono text-[11.5px] text-bone/65">
                  <LogEntry t="14:02" code="LC.01" body="Series-LLC cluster · Ascension" />
                  <LogEntry t="13:54" code="EP.07" body="LDEQ NOI · St. James" tone="amber" />
                  <LogEntry t="13:31" code="EF.04" body="Entity formed · 36 Devil St" />
                  <LogEntry t="12:49" code="LC.12" body="Parcel transfer · 412 ac" tone="amber" />
                  <LogEntry t="11:18" code="UP.03" body="MISO queue · 480 MW" />
                  <LogEntry t="10:50" code="PC.02" body="8-K · capex disclosed" tone="crit" />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-bone/[0.08] pt-3">
                  <span className="gcir-coord text-bone/40">tail · live</span>
                  <span className="gcir-coord text-[#7dd6a3]">stream OK</span>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Bottom hairline */}
        <div className="gcir-hairline" />
      </section>

      {/* ─── Live ticker ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-bone/[0.06] bg-[#0c100e]">
        <div className="gcir-ticker-mask flex">
          <div className="flex shrink-0 animate-ticker whitespace-nowrap py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-bone/45">
            {Array.from({ length: 2 }).flatMap((_, repeat) => [
              "Hyundai Steel · 141d lead",
              "Woodside LNG · 340d",
              "Air Products NH₃ · 612d",
              "Rio Grande LNG · 730d",
              "Meta Richland · 230d",
              "QLAD trip · 4 corridors",
              "10 signal families",
              `${signalCount.toLocaleString()} signals archived`,
              "0 paid aggregators",
              "Provenance · per claim",
            ].map((s, i) => (
              <span key={`${repeat}-${i}`} className="mx-8 inline-flex items-center gap-3">
                <span className="h-1 w-1 rounded-full bg-[#e9a539]" />
                {s}
              </span>
            )))}
          </div>
        </div>
      </section>

      {/* ─── Live proof bar ──────────────────────────────────────────────── */}
      <section className="relative bg-[#0c100e]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-3 divide-x divide-bone/[0.08] px-6 py-12">
          <ProofStat number={projectCount} label="Projects tracked"     sub="suspected · confirmed · monitored" />
          <ProofStat number={signalCount}  label="Signals archived"      sub="every claim → raw evidence" />
          <ProofStat number={sourceCount}  label="Live public sources"   sub="0 paid aggregators · 0 scrapers off-terms" />
        </div>
        <div className="gcir-hairline" />
      </section>

      {/* ─── Operating loop ──────────────────────────────────────────────── */}
      <section id="operating-loop" className="relative bg-[#0c100e]">
        <div className="mx-auto max-w-[1180px] px-6 py-32">
          <header className="mb-14 grid grid-cols-12 items-end gap-8">
            <div className="col-span-12 lg:col-span-7">
              <div className="gcir-eyebrow text-[#e9a539]/85">
                <span className="num">§01</span>
                <span>The operating loop</span>
              </div>
              <h2 className="font-display text-[52px] font-normal leading-[0.96] tracking-[-0.025em] text-bone sm:text-[64px]">
                From raw source<br />
                <span className="italic text-bone/55">to formation alert.</span>
              </h2>
            </div>
            <p className="col-span-12 max-w-md font-sans text-[15px] leading-[1.6] text-bone/55 lg:col-span-5">
              Four phases. Every contributor stays inspectable. The radar is not a black box —
              it is a captain's log of what was observed, when, by whom, and how confidence was earned.
            </p>
          </header>

          <div className="grid grid-cols-12 gap-px overflow-hidden rounded-[7px] border border-bone/[0.08] bg-bone/[0.04]">
            {PIPELINE.map((item, idx) => (
              <article key={item.step} className="group relative col-span-12 bg-[#0c100e] p-7 transition-colors hover:bg-[#10171a] sm:col-span-6 lg:col-span-3">
                {/* Stage roman numeral as hero */}
                <div className="mb-6 flex items-end justify-between">
                  <span className="font-display text-[68px] font-normal leading-none tracking-[-0.04em] text-[#e9a539]">{item.step}</span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-bone/30">phase {String(idx + 1).padStart(2, "0")}</span>
                </div>
                <div className="gcir-horizon mb-5 opacity-60" />
                <h3 className="font-sans text-[18px] font-semibold tracking-tight text-bone">{item.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-[1.6] text-bone/52">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="gcir-hairline" />
      </section>

      {/* ─── Signal taxonomy — the spec sheet ────────────────────────────── */}
      <section id="signals" className="relative bg-[#0a0d0c]">
        <div className="gcir-blueprint-dark pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-[1180px] px-6 py-32">
          <header className="mb-12 grid grid-cols-12 items-end gap-8">
            <div className="col-span-12 lg:col-span-7">
              <div className="gcir-eyebrow text-[#e9a539]/85">
                <span className="num">§02</span>
                <span>Signal taxonomy</span>
              </div>
              <h2 className="font-display text-[52px] font-normal leading-[0.96] tracking-[-0.025em] text-bone sm:text-[64px]">
                Ten families.<br />
                <span className="italic text-bone/55">All public. All free.</span>
              </h2>
            </div>
            <p className="col-span-12 max-w-md font-sans text-[15px] leading-[1.6] text-bone/55 lg:col-span-5">
              Each family carries an honest weight. The score is a weighted composite — auditable, contestable.
              No proprietary data. No paid aggregators. Every claim links to its raw evidence with URL,
              observed date, and confidence.
            </p>
          </header>

          <div className="overflow-hidden rounded-[7px] border border-bone/[0.08]">
            <div className="grid grid-cols-[64px_1fr_120px_1fr] items-center gap-x-6 border-b border-bone/[0.08] bg-bone/[0.03] px-6 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bone/40">
              <span>code</span>
              <span>family</span>
              <span className="text-right">weight</span>
              <span>watches</span>
            </div>
            {SIGNAL_FAMILIES.map((fam, idx) => (
              <div
                key={fam.code}
                className="group grid grid-cols-[64px_1fr_120px_1fr] items-center gap-x-6 border-b border-bone/[0.05] px-6 py-5 transition-colors last:border-b-0 hover:bg-bone/[0.03]"
              >
                <span className="font-mono text-[12px] text-bone/40 group-hover:text-[#e9a539]">{fam.code}</span>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rotate-45 bg-[#e9a539] opacity-80" style={{ opacity: 0.30 + (fam.weight / 50) }} />
                  <span className="font-sans text-[15.5px] font-medium tracking-tight text-bone">{fam.label}</span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <div className="relative h-1 w-14 overflow-hidden rounded bg-bone/[0.08]">
                    <div className="h-full bg-[#e9a539]" style={{ width: `${(fam.weight / 25) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[11.5px] font-semibold text-bone/70">{fam.weight}</span>
                </div>
                <p className="text-[12.5px] leading-[1.55] text-bone/45">{fam.desc}</p>
                {idx < SIGNAL_FAMILIES.length - 1 && (
                  <span className="pointer-events-none absolute" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Proof — backtest scoreboard ─────────────────────────────────── */}
      <section id="proof" className="relative bg-bone text-ink">
        <div className="gcir-blueprint pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1180px] px-6 py-32">
          <header className="mb-12 grid grid-cols-12 items-end gap-8">
            <div className="col-span-12 lg:col-span-7">
              <div className="gcir-eyebrow">
                <span className="num">§03</span>
                <span>Proof — backtest scoreboard</span>
              </div>
              <h2 className="font-display text-[52px] font-normal leading-[0.96] tracking-[-0.025em] text-ink sm:text-[64px]">
                Backtested against<br />
                <span className="italic text-ink/55">projects we already know.</span>
              </h2>
            </div>
            <p className="col-span-12 max-w-md font-sans text-[15px] leading-[1.6] text-ink/65 lg:col-span-5">
              We replayed the detector against public projects with known announcement dates.
              These are the average lead times between first ingested signal and the day the
              market got the news.
            </p>
          </header>

          {/* Big proof numbers */}
          <div className="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-[7px] border border-line bg-line/60 sm:grid-cols-4">
            <BigStat   value="411d"  label="Average lead time"      sub="across all validation projects" />
            <BigStat   value="730d"  label="Longest lead"           sub="Rio Grande LNG (NextDecade)" />
            <BigStat   value="10/10" label="Projects detected"      sub="ahead of public announcement" />
            <BigStat   value="0"     label="Paid aggregators"       sub="every signal traceable to source" />
          </div>

          {/* Validation table */}
          <div className="overflow-hidden rounded-[7px] border border-line bg-bone/95 shadow-md">
            <div className="grid grid-cols-[2fr_120px_1fr_120px_140px] items-center gap-x-4 border-b border-line bg-bone-2/80 px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              <span>Project</span>
              <span className="text-right">Capex</span>
              <span>Parish</span>
              <span className="text-right">Lead time</span>
              <span className="text-right">Coordinates</span>
            </div>
            {VALIDATION_PROJECTS.map((p) => (
              <div key={p.name} className="grid grid-cols-[2fr_120px_1fr_120px_140px] items-center gap-x-4 border-b border-line/70 px-5 py-4 transition-colors last:border-b-0 hover:bg-bone-2/60">
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c9402a]" />
                  <span className="font-sans text-[14px] font-medium text-ink">{p.name}</span>
                </div>
                <span className="text-right font-mono text-[12.5px] text-ink-3">{p.capex}</span>
                <span className="font-sans text-[13px] text-ink-3">{p.parish}</span>
                <span className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-[#c9402a]/30 bg-[#c9402a]/[0.08] px-2 py-0.5 font-mono text-[12px] font-semibold text-[#c9402a]">
                    {p.lead}
                  </span>
                </span>
                <span className="text-right font-mono text-[10.5px] text-muted">{p.coords}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 text-[12.5px]">
            <Link href={"/proof" as any} className="inline-flex items-center gap-1 text-ink/60 transition-colors hover:text-ink">
              Open full proof report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Manifesto pull-quote ────────────────────────────────────────── */}
      <section id="manifesto" className="relative overflow-hidden bg-[#0c100e] py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-[#e9a539]/[0.05] blur-3xl" />
          <div className="absolute -right-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-[#2f7575]/[0.04] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1080px] px-6">
          <div className="gcir-eyebrow text-[#e9a539]/85">
            <span className="num">§04</span>
            <span>Manifesto</span>
          </div>
          <blockquote className="mt-6 font-display text-[44px] leading-[1.18] tracking-[-0.018em] text-bone sm:text-[58px]">
            <span className="text-[#e9a539]">"</span>
            The market prices in what is already known. We price in what is{" "}
            <span className="italic">forming</span> — quietly, in parish councils,
            permit dockets, and shell-LLC filings — months before anyone calls it news.
            <span className="text-[#e9a539]">"</span>
          </blockquote>
          <div className="mt-10 flex items-center gap-4 font-mono text-[11.5px] uppercase tracking-[0.18em] text-bone/45">
            <span className="h-px w-10 bg-bone/35" />
            Brick &amp; Yield · Operating Doctrine · 2026
          </div>
        </div>
      </section>

      {/* ─── Email capture ───────────────────────────────────────────────── */}
      <section className="relative border-t border-bone/[0.06] bg-[#0c100e] py-28">
        <div className="mx-auto grid max-w-[1080px] grid-cols-12 gap-8 px-6">
          <div className="col-span-12 lg:col-span-5">
            <div className="gcir-eyebrow text-[#e9a539]/85">
              <span className="num">§05</span>
              <span>Sample brief</span>
            </div>
            <h2 className="font-display text-[42px] leading-[1.05] tracking-[-0.025em] text-bone sm:text-[52px]">
              Read what a Monday<br />brief looks like.
            </h2>
          </div>
          <div className="col-span-12 flex flex-col justify-center lg:col-span-7">
            <p className="mb-6 max-w-md text-[14.5px] leading-[1.6] text-bone/55">
              The weekly investor brief is generated by the BriefWriter agent, cleared
              through analyst review, then queued for distribution. No account required to read a sample.
            </p>
            <EmailCapture dark />
            <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bone/35">
              Mondays at 06:00 CT · plain text · unsubscribe in any issue
            </p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0a0d0c] py-32">
        <div className="gcir-blueprint-dark pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2">
          <div className="gcir-sweep absolute inset-0 rounded-full opacity-50" />
        </div>
        <div className="relative mx-auto max-w-[1080px] px-6 text-center">
          <h2 className="font-display text-[64px] leading-[0.95] tracking-[-0.025em] text-bone sm:text-[88px]">
            Open the radar.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[16px] leading-[1.6] text-bone/55">
            Full access for Gulf Coast operators, investors, and developers. No credit card needed.
            See what is forming before the announcement reaches the wire.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={"/sign-up" as any}
              className="group inline-flex h-12 items-center gap-2.5 rounded-[4px] bg-[#e9a539] px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0c100e] transition-all hover:bg-[#f4b94f] hover:shadow-[0_0_0_1px_#e9a539,0_16px_40px_rgba(233,165,57,0.4)]"
            >
              Get full access — free
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
            </Link>
            <Link
              href="/radar"
              className="inline-flex h-12 items-center gap-2 rounded-[4px] border border-bone/15 px-6 text-[13px] font-medium uppercase tracking-[0.08em] text-bone/75 transition-colors hover:border-[#e9a539]/60 hover:text-bone"
            >
              Watch a corridor
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer — captain's log ──────────────────────────────────────── */}
      <footer className="border-t border-bone/[0.06] bg-[#0a0d0c]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-12 gap-6 px-6 py-12">
          <div className="col-span-12 sm:col-span-5">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div className="font-display text-[19px] tracking-[-0.01em] text-bone">Brick &amp; Yield</div>
            </div>
            <p className="mt-3 max-w-xs text-[12.5px] leading-[1.6] text-bone/45">
              Industrial-intelligence operating console for the Gulf Coast petrochemical, LNG,
              and data-center build-out. brickandyield.com
            </p>
          </div>
          <div className="col-span-6 sm:col-span-2">
            <FooterCol title="Console" items={[
              ["Radar", "/radar"],
              ["Alerts", "/alerts"],
              ["Briefs", "/briefs"],
              ["Proof", "/proof"],
            ]} />
          </div>
          <div className="col-span-6 sm:col-span-2">
            <FooterCol title="Reference" items={[
              ["Signals", "/signals"],
              ["Sources", "/sources"],
              ["Watchlists", "/watchlists"],
            ]} />
          </div>
          <div className="col-span-12 sm:col-span-3">
            <FooterCol title="Company" items={[
              ["Contact", "mailto:blake@brickandyield.com"],
              ["Sign in", "/sign-in"],
              ["Sign up", "/sign-up"],
            ]} />
          </div>
        </div>
        <div className="border-t border-bone/[0.05]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bone/35">
            <span>© 26 · brickandyield · all rights reserved</span>
            <span>Build 2026.05 · v0.1.0 · operating</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────────────────── */

function BrandMark() {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-bone/15 bg-bone/[0.04] backdrop-blur">
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="#e9a539" strokeWidth="1.4">
        <circle cx="16" cy="16" r="13" />
        <circle cx="16" cy="16" r="8" opacity=".55" />
        <circle cx="16" cy="16" r="3" />
        <line x1="16" y1="3" x2="16" y2="29" opacity=".4" />
        <line x1="3" y1="16" x2="29" y2="16" opacity=".4" />
        <line x1="16" y1="16" x2="26" y2="6" stroke="#e9a539" strokeWidth="2" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#7dd6a3] gcir-ping" />
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#7dd6a3]" />
    </span>
  );
}

function LogEntry({ t, code, body, tone }: { t: string; code: string; body: string; tone?: "amber" | "crit" }) {
  const accent = tone === "crit" ? "text-[#c9402a]" : tone === "amber" ? "text-[#e9a539]" : "text-bone/65";
  const dot = tone === "crit" ? "bg-[#c9402a]" : tone === "amber" ? "bg-[#e9a539]" : "bg-bone/35";
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-bone/35">{t}</span>
      <span className={`h-1 w-1 rounded-full ${dot}`} />
      <span className={`${accent} font-semibold`}>{code}</span>
      <span className="truncate text-bone/55">{body}</span>
    </div>
  );
}

function ProofStat({ number, label, sub }: { number: number; label: string; sub: string }) {
  return (
    <div className="px-8 first:pl-0 last:pr-0">
      <div className="font-display text-[64px] font-normal leading-none tracking-[-0.025em] text-bone">
        {number.toLocaleString()}
      </div>
      <div className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e9a539]">{label}</div>
      <div className="mt-1.5 text-[11.5px] leading-[1.5] text-bone/40">{sub}</div>
    </div>
  );
}

function BigStat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="bg-bone px-7 py-8">
      <div className="font-display text-[64px] font-normal leading-none tracking-[-0.025em] text-ink">{value}</div>
      <div className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#a96f17]">{label}</div>
      <div className="mt-1 text-[11.5px] leading-[1.5] text-ink/55">{sub}</div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bone/40">{title}</div>
      <ul className="space-y-2">
        {items.map(([label, href]) => (
          <li key={label}>
            <Link href={href as any} className="inline-flex items-center gap-1.5 text-[13px] text-bone/70 transition-colors hover:text-[#e9a539]">
              <ChevronRight className="h-3 w-3 opacity-40" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
