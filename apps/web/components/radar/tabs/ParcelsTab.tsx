"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import maplibregl from "maplibre-gl";
import { fmtAcres, fmtDate } from "@/lib/format";
import type { RadarProject } from "../RadarShell";

/* ─── types ──────────────────────────────────────────────────────────── */
type LegacyParcel = {
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

type ParcelFeatureProps = {
  signalId: string;
  owner: string | null;
  parcelNumber: string | null;
  acres: number | null;
  zoning: string | null;
  floodZone: string | null;
  saleYear: string | null;
  ownerAddress: string | null;
  observedAt: string;
  label: string;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/* ─── color map by zoning ────────────────────────────────────────────── */
const ZONING_COLOR: Record<string, string> = {
  A1:   "#10a37f",
  CITY: "#4a90e2",
};
function zoningColor(z: string | null): string {
  if (!z) return "#c084fc";
  return ZONING_COLOR[z.trim().toUpperCase()] ?? "#c084fc";
}

/* ─── tooltip HTML ────────────────────────────────────────────────────── */
function tooltipHTML(p: ParcelFeatureProps): string {
  return `
    <div style="font-family:Inter,sans-serif;font-size:12px;min-width:180px;max-width:260px;line-height:1.55;">
      ${p.owner ? `<div style="font-weight:600;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.owner}</div>` : ""}
      ${p.parcelNumber ? `<div style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.45);margin-bottom:6px;">${p.parcelNumber}</div>` : ""}
      <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;">
        ${p.acres  ? `<span style="color:rgba(255,255,255,.4);">Acres</span><span>${p.acres.toFixed(1)}</span>` : ""}
        ${p.zoning ? `<span style="color:rgba(255,255,255,.4);">Zoning</span><span>${p.zoning}</span>` : ""}
        ${p.saleYear ? `<span style="color:rgba(255,255,255,.4);">Sale yr</span><span>${p.saleYear}</span>` : ""}
        ${p.floodZone ? `<span style="color:rgba(255,255,255,.4);">Flood</span><span style="color:#f87171;">${p.floodZone}</span>` : ""}
      </div>
    </div>`;
}

/* ─── component ──────────────────────────────────────────────────────── */
export function ParcelsTab({
  projectId,
  project,
}: {
  projectId: string;
  project: RadarProject;
}) {
  /* legacy parcel-interest data (formal ParcelInterest rows) */
  const { data: formalData } = useSWR<{ parcels: LegacyParcel[] }>(
    `/api/projects/${projectId}/parcels`,
    fetcher,
  );
  const formalParcels = formalData?.parcels ?? [];

  /* signal-based parcel GeoJSON */
  const { data: geoData, isLoading: geoLoading } = useSWR<GeoJSON.FeatureCollection>(
    `/api/projects/${projectId}/parcel-signals`,
    fetcher,
  );
  const featureCount = geoData?.features.length ?? 0;

  /* map */
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef          = useRef<maplibregl.Map | null>(null);
  const hoveredId       = useRef<string | number | null>(null);
  const [hoveredParcel, setHoveredParcel] = useState<ParcelFeatureProps | null>(null);

  /* total acres from signals */
  const totalSignalAcres = (geoData?.features ?? []).reduce(
    (sum, f) => sum + ((f.properties?.acres as number | null) ?? 0),
    0,
  );

  /* owner breakdown */
  const ownerMap = new Map<string, number>();
  for (const f of geoData?.features ?? []) {
    const owner = (f.properties?.owner as string | null) ?? "Unknown";
    ownerMap.set(owner, (ownerMap.get(owner) ?? 0) + ((f.properties?.acres as number | null) ?? 0));
  }
  const topOwners = [...ownerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  /* ── init map ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!document.getElementById("gcir-popup-style")) {
      const s = document.createElement("style");
      s.id = "gcir-popup-style";
      s.textContent = `
        .gcir-pp .maplibregl-popup-content {
          background:rgba(10,10,10,.92)!important;
          backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,.12);
          border-radius:8px!important;
          padding:10px 12px!important;
          box-shadow:0 8px 32px rgba(0,0,0,.5);
          color:#fff;
        }
        .gcir-pp .maplibregl-popup-tip { display:none; }
      `;
      document.head.appendChild(s);
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "Esri, Maxar",
            maxzoom: 19,
          },
          labels: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OSM © CARTO",
          },
        },
        layers: [
          { id: "sat",    type: "raster", source: "satellite" },
          { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.8 } },
        ],
      } as never,
      center: [project.lng, project.lat],
      zoom: 11.5,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "gcir-pp", maxWidth: "280px" });

    map.on("load", () => {
      mapRef.current = map;

      map.addSource("parcels", {
        type: "geojson",
        data: geoData ?? { type: "FeatureCollection", features: [] },
        generateId: true,
      });

      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": ["case",
            ["==", ["get", "zoning"], "A1"],   "#10a37f",
            ["==", ["get", "zoning"], "CITY"], "#4a90e2",
            "#c084fc",
          ],
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.6, 0.25],
        },
      });

      map.addLayer({
        id: "parcel-stroke",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": ["case",
            ["==", ["get", "zoning"], "A1"],   "#10a37f",
            ["==", ["get", "zoning"], "CITY"], "#4a90e2",
            "#c084fc",
          ],
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 0.9],
          "line-opacity": 0.9,
        },
      });

      map.on("mousemove", "parcel-fill", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        map.getCanvas().style.cursor = "crosshair";
        if (hoveredId.current !== null && hoveredId.current !== feat.id) {
          map.setFeatureState({ source: "parcels", id: hoveredId.current }, { hover: false });
        }
        if (feat.id !== undefined) {
          hoveredId.current = feat.id;
          map.setFeatureState({ source: "parcels", id: feat.id }, { hover: true });
        }
        if (feat.properties) {
          setHoveredParcel(feat.properties as ParcelFeatureProps);
          popup.setLngLat(e.lngLat).setHTML(tooltipHTML(feat.properties as ParcelFeatureProps)).addTo(map);
        }
      });

      map.on("mouseleave", "parcel-fill", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredId.current !== null) {
          map.setFeatureState({ source: "parcels", id: hoveredId.current }, { hover: false });
          hoveredId.current = null;
        }
        setHoveredParcel(null);
        popup.remove();
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.lat, project.lng]);

  /* ── update parcel source when data arrives ────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;
    const src = map.getSource("parcels") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(geoData);
  }, [geoData]);

  return (
    <div className="flex flex-col gap-4">

      {/* ── map ─────────────────────────────────────────────────── */}
      <div
        ref={mapContainerRef}
        className="h-[300px] overflow-hidden rounded-lg border border-line"
      />

      {/* ── stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Signal parcels" value={String(featureCount)} note="with boundary data" />
        <StatCard label="Total acres" value={fmtAcres(totalSignalAcres)} note="from signal geometry" />
        <StatCard label="Formal interests" value={String(formalParcels.length)} note="tracked in DB" />
      </div>

      {/* ── legend ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-line bg-bg-2 px-4 py-3">
        <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
          Zoning key
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Agricultural (A1)", color: "#10a37f" },
            { label: "City / Urban",      color: "#4a90e2" },
            { label: "Other",             color: "#c084fc" },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <div className="h-3 w-3 rounded-sm" style={{ background: z.color, opacity: 0.8 }} />
              {z.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── hovered parcel detail ───────────────────────────────── */}
      {hoveredParcel && (
        <div className="rounded-lg border border-line bg-bg-2 px-4 py-3 text-[12.5px]">
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
            Hovered parcel
          </div>
          <div className="font-semibold text-ink">{hoveredParcel.owner ?? "Unknown owner"}</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">{hoveredParcel.parcelNumber}</div>
          <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1 text-[11.5px]">
            {hoveredParcel.acres  && <><span className="text-muted">Acres</span><span className="col-span-2 font-mono">{hoveredParcel.acres.toFixed(1)}</span></>}
            {hoveredParcel.zoning && <><span className="text-muted">Zoning</span><span className="col-span-2">{hoveredParcel.zoning}</span></>}
            {hoveredParcel.floodZone && <><span className="text-muted">Flood</span><span className="col-span-2 text-warn">{hoveredParcel.floodZone}</span></>}
            {hoveredParcel.saleYear && <><span className="text-muted">Sale yr</span><span className="col-span-2 font-mono">{hoveredParcel.saleYear}</span></>}
          </div>
        </div>
      )}

      {/* ── top owners ──────────────────────────────────────────── */}
      {topOwners.length > 0 && (
        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
            Top owners by acreage
          </div>
          <div className="space-y-1.5">
            {topOwners.map(([owner, acres], i) => {
              const pct = totalSignalAcres > 0 ? (acres / totalSignalAcres) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2.5 text-[12px]">
                  <div className="w-3.5 text-right font-mono text-[10px] text-muted">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{owner}</div>
                    <div
                      className="mt-0.5 h-1 rounded-full"
                      style={{
                        width: `${Math.max(pct, 1.5)}%`,
                        background: `${zoningColor(null)}90`,
                      }}
                    />
                  </div>
                  <div className="flex-shrink-0 font-mono text-[11px] text-muted-2">
                    {acres.toFixed(1)} ac
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── formal parcel table (if any) ────────────────────────── */}
      {formalParcels.length > 0 && (
        <div>
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
            Formally tracked parcels
          </div>
          <table className="w-full border-separate border-spacing-0 text-[12px]">
            <thead>
              <tr>
                {["Parcel", "Acres", "Owner", "Acquired", "$/ac", "Zoning"].map((h) => (
                  <th key={h} className="border-b border-line bg-bg-2 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formalParcels.map((p) => (
                <tr key={p.id} className="hover:bg-bg-2">
                  <td className="border-b border-line-2 px-2 py-1.5 font-mono text-[10.5px] text-ink-3">{p.parcelNumber}</td>
                  <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">{fmtAcres(p.acres)}</td>
                  <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">{p.buyerName ?? "—"}</td>
                  <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">{fmtDate(p.acquiredAt)}</td>
                  <td className="border-b border-line-2 px-2 py-1.5 font-mono text-[10.5px] text-ink-3">
                    {p.pricePerAcre ? `$${(p.pricePerAcre / 1000).toFixed(1)}k` : "—"}
                  </td>
                  <td className="border-b border-line-2 px-2 py-1.5 text-ink-2">{p.zoning ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── loading state ────────────────────────────────────────── */}
      {geoLoading && featureCount === 0 && (
        <div className="rounded-md border border-dashed border-line bg-bg-2 py-6 text-center text-[13px] text-muted">
          Loading parcel boundaries…
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-md border border-line bg-bg-2 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{note}</div>
    </div>
  );
}
