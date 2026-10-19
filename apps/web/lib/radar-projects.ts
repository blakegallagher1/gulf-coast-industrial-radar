import { scoreBand, type ScoreBand } from "@gcir/shared";

type SiteRow = {
  centerLat: number | null;
  centerLng: number | null;
  totalAcres: number | null;
};

export type RadarProjectRow = {
  id: string;
  publicId: string;
  name: string;
  stage: string;
  score: number;
  parishCounty: string | null;
  state: string | null;
  corridor: string | null;
  facilityType: string | null;
  firstSignalAt: Date | string | null;
  estimatedCapex: unknown | null;
  sites: SiteRow[];
};

export type RadarProjectData = {
  id: string;
  publicId: string;
  name: string;
  stage: string;
  score: number;
  band: ScoreBand;
  parishCounty: string;
  state: string;
  corridor: string;
  acres: number | null;
  facilityType: string | null;
  lat: number | null;
  lng: number | null;
  firstSignalAt: string | null;
  estimatedCapex: string | null;
};

function toRadarProject(project: RadarProjectRow): RadarProjectData {
  const site = project.sites[0];
  const firstSignalAt = project.firstSignalAt instanceof Date
    ? project.firstSignalAt.toISOString()
    : project.firstSignalAt;
  return {
    id: project.id,
    publicId: project.publicId,
    name: project.name,
    stage: project.stage,
    score: project.score,
    band: scoreBand(project.score),
    parishCounty: project.parishCounty ?? "",
    state: project.state ?? "",
    corridor: project.corridor ?? "",
    acres: site?.totalAcres ?? null,
    facilityType: project.facilityType ?? null,
    lat: site?.centerLat ?? null,
    lng: site?.centerLng ?? null,
    firstSignalAt,
    estimatedCapex: project.estimatedCapex == null ? null : String(project.estimatedCapex),
  };
}

export function buildRadarProjects(
  feed: RadarProjectRow[],
  requested: RadarProjectRow | null,
): RadarProjectData[] {
  const projects = feed
    .filter((project) => project.sites[0]?.centerLat != null && project.sites[0]?.centerLng != null)
    .map(toRadarProject);
  if (requested && !projects.some((project) => project.id === requested.id)) {
    projects.push(toRadarProject(requested));
  }
  return projects;
}
