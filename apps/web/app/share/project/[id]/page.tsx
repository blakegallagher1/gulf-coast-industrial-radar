import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@gcir/db";
import { ArrowUpRight, MapPin, TrendingUp } from "lucide-react";

function scoreBand(score: number) {
  if (score >= 90) return { label: "High",     color: "#c9402a" }; // cinnabar
  if (score >= 75) return { label: "Elevated", color: "#e9a539" }; // phosphor amber
  if (score >= 60) return { label: "Watch",    color: "#2f7575" }; // patina teal
  return                  { label: "Weak",     color: "#7a847f" };
}

async function findProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      sites: { take: 1 },
      signals: { orderBy: { observedAt: "desc" }, take: 3 },
    },
  });
  if (project) return project;

  return prisma.project.findFirst({
    where: { publicId: id },
    include: {
      sites: { take: 1 },
      signals: { orderBy: { observedAt: "desc" }, take: 3 },
    },
  });
}

export default async function ShareProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await findProject(id);
  if (!project) notFound();

  const band = scoreBand(project.score);
  const site = project.sites?.[0];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0c100e] p-6">
      {/* Background sweep */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-25">
        <div className="gcir-sweep absolute inset-0 rounded-full" />
        <div className="absolute inset-[18%] rounded-full border border-bone/[0.05]" />
        <div className="absolute inset-[36%] rounded-full border border-bone/[0.05]" />
      </div>
      <div className="gcir-blueprint-dark pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[10px] border border-bone/[0.10] bg-[#0c100e]/85 backdrop-blur-md shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
        {site?.centerLat && site?.centerLng && (
          <div className="relative h-44 w-full overflow-hidden bg-bone/[0.05]">
            {process.env.MAPTILER_KEY && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://api.maptiler.com/maps/dataviz-dark/static/${site.centerLng},${site.centerLat},11/600x240@2x.png?key=${process.env.MAPTILER_KEY}`}
                alt="Project location"
                className="h-full w-full object-cover opacity-80"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c100e]" />
            <div className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.16em] text-bone/55">
              {site.centerLat.toFixed(4)}°N · {site.centerLng.toFixed(4)}°W
            </div>
          </div>
        )}

        <div className="px-7 py-7">
          {/* Eyebrow */}
          <div className="gcir-eyebrow text-accent">
            <span className="num">§{project.publicId}</span>
            <span>Formation report</span>
          </div>

          {/* Title + score */}
          <div className="mt-3 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[32px] leading-[1.05] tracking-[-0.022em] text-bone">
                {project.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.10em] text-bone/55">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.parishCounty}{project.state ? ` · ${project.state}` : ""}
                </span>
                {project.corridor && (
                  <span className="rounded-[3px] border border-bone/15 bg-bone/[0.04] px-1.5 py-0.5">
                    {project.corridor}
                  </span>
                )}
                <span className="rounded-[3px] border border-bone/15 bg-bone/[0.04] px-1.5 py-0.5">
                  {project.stage.toLowerCase().replace(/_/g, "-")}
                </span>
              </div>
            </div>
            <div
              className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-[6px] border border-bone/[0.10] bg-bone/[0.04]"
            >
              <div className="font-display text-[28px] leading-none tabular-nums" style={{ color: band.color }}>
                {project.score}
              </div>
              <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.16em]" style={{ color: band.color }}>
                {band.label}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-bone/45">
              <span>formation score</span>
              <span>{project.score} / 100</span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-bone/[0.06]">
              <div className="h-full rounded-full transition-all" style={{ width: `${project.score}%`, background: band.color }} />
              {[40, 60, 75, 90].map((tick) => (
                <span key={tick} className="absolute top-0 h-full w-px bg-[#0c100e]/60" style={{ left: `${tick}%` }} />
              ))}
            </div>
          </div>

          {project.signals.length > 0 && (
            <div className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                Latest signals
              </div>
              <ul className="mt-2.5 space-y-2">
                {project.signals.map((s) => (
                  <li key={s.id} className="flex items-start gap-2 text-[12.5px] leading-snug">
                    <TrendingUp className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
                    <span className="text-bone/75">{s.subjectLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="gcir-hairline mt-6" />

          <Link
            href="/?ref=share"
            className="group mt-6 flex h-11 items-center justify-center gap-2 rounded-[5px] bg-accent px-4 text-[12.5px] font-semibold uppercase tracking-[0.10em] text-[#0c100e] transition-all hover:bg-[#f4b94f] hover:shadow-[0_0_0_1px_#e9a539,0_8px_24px_rgba(233,165,57,0.3)]"
          >
            See full analysis
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
          </Link>

          <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bone/35">
            <BrandMark size={14} />
            Brick &amp; Yield · brickandyield.com
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandMark({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="#e9a539" strokeWidth="1.6">
      <circle cx="16" cy="16" r="13" />
      <circle cx="16" cy="16" r="6" opacity=".55" />
      <line x1="16" y1="16" x2="26" y2="6" stroke="#e9a539" strokeWidth="2" />
      <circle cx="16" cy="16" r="2" fill="#e9a539" stroke="none" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = (await prisma.project.findUnique({ where: { id } }))
    ?? (await prisma.project.findFirst({ where: { publicId: id } }));

  if (!project) return { title: "Project Not Found" };

  const band = scoreBand(project.score);
  return {
    title: `${project.name} — Formation Score ${project.score} (${band.label}) | Brick & Yield`,
    description: `${project.name} in ${project.parishCounty}, ${project.state} — ${project.stage.toLowerCase().replace(/_/g, " ")} stage. Formation score ${project.score}/100.`,
    openGraph: {
      title: `${project.name} — Formation Score ${project.score}`,
      description: `${band.label} conviction industrial project in ${project.parishCounty}. ${project.stage.toLowerCase().replace(/_/g, " ")} stage.`,
      siteName: "Brick & Yield",
    },
  };
}
