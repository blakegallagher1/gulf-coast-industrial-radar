"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import maplibregl from "maplibre-gl";
import { fmtAcres, fmtDate } from "@/lib/format";
import type { RadarProject } from "../RadarShell";

type Parcel = {
  id: string;
  parcelNumber: string;
  acres: number | null;
  zoning: string | null;
  buyerName: string | null;
  acquiredAt: string | null;
  pricePerAcre: number | null;
  centerLat: number | null;
  centerLng: number | null;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export function ParcelsTab({
  projectId,
  project,
}: {
  projectId: string;
  project: RadarProject;
}) {
  const { data } = useSWR<{ parcels: Parcel[] }>(
    `/api/projects/${projectId}/parcels`,
    fetcher,
  );
  const parcels = data?.parcels ?? [];
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          cv: {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
        },
        layers: [{ id: "cv", type: "raster", source: "cv" }],
      } as never,
      center: [project.lng, project.lat],
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [project.lat, project.lng]);

  return (
    <div>
      <div ref={ref} className="mb-3.5 h-[220px] overflow-hidden rounded-md border border-line" />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3.5 text-[12px] text-muted">
          <span><strong className="font-semibold text-ink">{parcels.length} parcels</strong></span>
          <span>{fmtAcres(parcels.reduce((s, p) => s + (p.acres ?? 0), 0))} controlled</span>
        </div>
      </div>

      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead>
          <tr className="border-b border-line">
            <th className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">Parcel</th>
            <th className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">Acres</th>
            <th className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">Owner</th>
            <th className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">Acquired</th>
            <th className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">$/ac</th>
            <th className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.05em] text-muted">Zoning</th>
          </tr>
        </thead>
        <tbody>
          {parcels.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-6 text-center text-muted">
                No parcels associated yet.
              </td>
            </tr>
          )}
          {parcels.map((p) => (
            <tr key={p.id} className="hover:bg-bg-2">
              <td className="border-b border-line-2 px-2 py-1.5 font-mono text-[11.5px] text-ink-3">
                {p.parcelNumber}
              </td>
              <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">
                {fmtAcres(p.acres)}
              </td>
              <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">
                {p.buyerName ?? "—"}
              </td>
              <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">
                {fmtDate(p.acquiredAt)}
              </td>
              <td className="border-b border-line-2 px-2 py-1.5 font-mono text-[11.5px] text-ink-3">
                {p.pricePerAcre ? `$${(p.pricePerAcre / 1000).toFixed(1)}k` : "—"}
              </td>
              <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">
                {p.zoning ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
