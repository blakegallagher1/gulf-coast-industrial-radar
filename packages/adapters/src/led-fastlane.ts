/**
 * LED FastLane adapter
 *
 * Phase 3 fix: domain moved to fastlaneng.louisianaeconomicdevelopment.com.
 */

import { fetch } from "undici";

const BASE = "https://fastlaneng.louisianaeconomicdevelopment.com";

export type FastLaneProject = {
  id: string;
  name: string;
  company: string;
  parish: string;
  announcedDate: string;
  investmentUsd: number;
  jobsCreated: number;
  status: string;
  naicsCode: string;
  description: string;
};

export type FastLaneSearchParams = {
  keyword?: string;
  status?: "announced" | "under_construction" | "completed";
  parish?: string;
  page?: number;
  perPage?: number;
};

export async function searchProjects(
  params: FastLaneSearchParams = {},
): Promise<{ total: number; page: number; projects: FastLaneProject[] }> {
  const url = new URL(`${BASE}/projects/search`);
  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.parish) url.searchParams.set("parish", params.parish);
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set("per_page", String(params.perPage ?? 25));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "GulfCoastIndustrialRadar/0.3 (contact@gcir.dev)" },
  });

  if (!res.ok) throw new Error(`LED FastLane HTTP ${res.status}`);

  const json = (await res.json()) as {
    total: number;
    page: number;
    per_page: number;
    projects: Array<{
      id: string;
      name: string;
      company: string;
      parish: string;
      announced_date: string;
      investment_usd: number;
      jobs_created: number;
      status: string;
      naics_code: string;
      description: string;
    }>;
  };

  return {
    total: json.total,
    page: json.page,
    projects: json.projects.map((p) => ({
      id: p.id,
      name: p.name,
      company: p.company,
      parish: p.parish,
      announcedDate: p.announced_date,
      investmentUsd: p.investment_usd,
      jobsCreated: p.jobs_created,
      status: p.status,
      naicsCode: p.naics_code,
      description: p.description,
    })),
  };
}
