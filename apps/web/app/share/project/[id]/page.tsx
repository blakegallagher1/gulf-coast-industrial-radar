import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@gcir/db";
import { ArrowRight, MapPin, Radar, TrendingUp } from "lucide-react";

function scoreBand(score: number) {
  if (score >= 80) return { label: "High", color: "#b3261e" };
  if (score >= 60) return { label: "Elevated", color: "#c97a16" };
  if (score >= 40) return { label: "Watch", color: "#1f5fa8" };
  return { label: "Weak", color: "#6b6b6b" };
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-lg">
        {site?.centerLat && site?.centerLng && (
          <div className="relative h-48 w-full overflow-hidden bg-stone-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.maptiler.com/maps/dataviz-dark/static/${site.centerLng},${site.centerLat},11/600x240@2x.png?key=${process.env.MAPTILER_KEY ?? ""}`}
              alt="Project location"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl font-mono text-[24px] font-bold text-white"
              style={{ background: band.color }}
            >
              {project.score}
            </div>
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">
                Formation score · {band.label}
              </div>
              <h1 className="text-[20px] font-semibold leading-tight text-white">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-3 text-[12.5px] text-stone-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {project.parishCounty}{project.state ? `, ${project.state}` : ""}
            </span>
            {project.corridor && (
              <span className="rounded border border-stone-700 px-1.5 py-0.5 text-[11px] font-medium">
                {project.corridor}
              </span>
            )}
            <span className="rounded border border-stone-700 px-1.5 py-0.5 text-[11px] font-medium">
              {project.stage.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>

          {project.signals.length > 0 && (
            <div className="mb-6 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Latest signals
              </div>
              {project.signals.map((s: any) => (
                <div key={s.id} className="flex items-start gap-2 text-[12.5px]">
                  <TrendingUp className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
                  <span className="text-stone-300">{s.subjectLabel}</span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/?ref=share"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-ink"
          >
            See full analysis on Gulf Coast Industrial Radar
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-stone-600">
            <Radar className="h-3 w-3" />
            Gulf Coast Industrial Radar · gulfcoastradar.com
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } })
    ?? await prisma.project.findFirst({ where: { publicId: id } });

  if (!project) return { title: "Project Not Found" };

  const band = scoreBand(project.score);
  return {
    title: `${project.name} — Score ${project.score} (${band.label}) | GCIR`,
    description: `${project.name} in ${project.parishCounty}, ${project.state} — ${project.stage.toLowerCase().replace(/_/g, " ")} stage. Formation score ${project.score}/100.`,
    openGraph: {
      title: `${project.name} — Formation Score ${project.score}`,
      description: `${band.label} conviction industrial project in ${project.parishCounty}. ${project.stage.toLowerCase().replace(/_/g, " ")} stage.`,
      siteName: "Gulf Coast Industrial Radar",
    },
  };
}
