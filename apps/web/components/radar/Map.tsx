"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { BAND_COLOR } from "@gcir/shared";
import type { RadarProject } from "./RadarShell";

/* ─── map style: dark satellite + labels ──────────────────────────────── */
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
    labels: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OSM contributors © CARTO",
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
};

/* ─── layer ids ──────────────────────────────────────────────────────── */
const LAYER_PARCEL_FILL   = "gcir-parcel-fill";
const LAYER_PARCEL_STROKE = "gcir-parcel-stroke";
const LAYER_PARCEL_HOVER  = "gcir-parcel-hover";
const SOURCE_PARCELS      = "gcir-parcels";

/* ─── tooltip helper ─────────────────────────────────────────────────── */
function buildTooltipHTML(props: Record<string, unknown>): string {
  const owner  = props.owner  as string | null;
  const parcel = props.parcelNumber as string | null;
  const acres  = props.acres  as number | null;
  const zoning = props.zoning as string | null;
  const sale   = props.saleYear as string | null;
  const flood  = props.floodZone as string | null;
  return `
    <div style="font-family:Inter,sans-serif;font-size:12px;min-width:180px;max-width:260px;line-height:1.5;">
      ${owner
        ? `<div style="font-weight:600;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${owner}</div>`
        : ""}
      ${parcel ? `<div style="font-family:monospace;font-size:10.5px;color:rgba(255,255,255,.5);margin-bottom:6px;">${parcel}</div>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;">
        ${acres  ? `<span style="color:rgba(255,255,255,.4);">Acres</span><span style="color:#fff;">${acres.toFixed(1)}</span>` : ""}
        ${zoning ? `<span style="color:rgba(255,255,255,.4);">Zoning</span><span style="color:#fff;">${zoning}</span>` : ""}
        ${sale   ? `<span style="color:rgba(255,255,255,.4);">Sale yr</span><span style="color:#fff;">${sale}</span>` : ""}
        ${flood  ? `<span style="color:rgba(255,255,255,.4);">Flood</span><span style="color:#e57373;">${flood}</span>` : ""}
      </div>
    </div>`;
}

/* ─── pulsing ring marker ─────────────────────────────────────────────── */
function createPulseMarker(color: string, score: number): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;width:44px;height:44px;cursor:pointer;";

  // outer pulse ring
  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position:absolute;inset:-10px;border-radius:50%;
    border:2px solid ${color};opacity:0.5;
    animation:gcir-pulse 2s ease-out infinite;
    pointer-events:none;
  `;
  wrap.appendChild(pulse);

  // inner circle
  const inner = document.createElement("div");
  inner.style.cssText = `
    position:absolute;inset:0;border-radius:50%;
    background:${color};
    display:flex;align-items:center;justify-content:center;
    font-family:JetBrains Mono,monospace;font-weight:700;font-size:11px;color:#fff;
    box-shadow:0 0 0 3px rgba(0,0,0,.4),0 4px 16px ${color}80;
    transition:transform .15s ease,box-shadow .15s ease;
  `;
  inner.textContent = String(score);
  wrap.appendChild(inner);
  return wrap;
}

/* ─── component ─────────────────────────────────────────────────────── */
export function RadarMap({
  projects,
  activeId,
  onSelect,
}: {
  projects: RadarProject[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef  = useRef<HTMLDivElement | null>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const markersRef    = useRef<Map<string, maplibregl.Marker>>(new Map());
  const tooltipRef    = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef  = useRef<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const activeIdRef   = useRef<string | null>(activeId);
  activeIdRef.current = activeId;

  /* ── init map ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current || mapError) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE as never,
        center: [-91.8, 30.1],
        zoom: 6.8,
        attributionControl: { compact: true },
        pitchWithRotate: false,
      });
    } catch (err) {
      setMapError((err as Error).message || "Map renderer unavailable");
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-left");
    map.on("error", (event) => {
      const error = event.error as Error | undefined;
      if (/webgl|context/i.test(error?.message ?? "")) {
        setMapError(error?.message ?? "Map renderer unavailable");
      }
    });

    /* inject pulse keyframe once */
    if (!document.getElementById("gcir-pulse-style")) {
      const s = document.createElement("style");
      s.id = "gcir-pulse-style";
      s.textContent = `
        @keyframes gcir-pulse {
          0%   { transform:scale(1);   opacity:.5; }
          70%  { transform:scale(1.6); opacity:0;  }
          100% { transform:scale(1.6); opacity:0;  }
        }
      `;
      document.head.appendChild(s);
    }

    /* parcel hover tooltip */
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "gcir-parcel-popup",
      offset: [0, -4],
      maxWidth: "280px",
    });
    tooltipRef.current = popup;

    /* inject popup style once */
    if (!document.getElementById("gcir-popup-style")) {
      const s = document.createElement("style");
      s.id = "gcir-popup-style";
      s.textContent = `
        .gcir-parcel-popup .maplibregl-popup-content {
          background:rgba(10,10,10,.92)!important;
          backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,.12);
          border-radius:8px!important;
          padding:10px 12px!important;
          box-shadow:0 8px 32px rgba(0,0,0,.5);
          color:#fff;
        }
        .gcir-parcel-popup .maplibregl-popup-tip { display:none; }
      `;
      document.head.appendChild(s);
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [mapError]);

  /* ── load parcel GeoJSON when active project changes ─────────────── */
  const loadParcelLayer = useCallback(async (projectId: string | null) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // remove old layers
    for (const lyr of [LAYER_PARCEL_HOVER, LAYER_PARCEL_STROKE, LAYER_PARCEL_FILL]) {
      if (map.getLayer(lyr)) map.removeLayer(lyr);
    }
    if (map.getSource(SOURCE_PARCELS)) map.removeSource(SOURCE_PARCELS);

    if (!projectId) return;

    let geoJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
    try {
      const res = await fetch(`/api/projects/${projectId}/parcel-signals`);
      if (res.ok) geoJSON = await res.json() as GeoJSON.FeatureCollection;
    } catch {
      // silently skip on network error
    }

    if (!map.getSource(SOURCE_PARCELS)) {
      map.addSource(SOURCE_PARCELS, { type: "geojson", data: geoJSON, generateId: true });
    }

    /* fill */
    map.addLayer({
      id: LAYER_PARCEL_FILL,
      type: "fill",
      source: SOURCE_PARCELS,
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "zoning"], "A1"], "#10a37f",
          ["==", ["get", "zoning"], "CITY"], "#1f5fa8",
          "#7e22ce",
        ],
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.55, 0.22],
      },
    });

    /* stroke */
    map.addLayer({
      id: LAYER_PARCEL_STROKE,
      type: "line",
      source: SOURCE_PARCELS,
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "zoning"], "A1"], "#10a37f",
          ["==", ["get", "zoning"], "CITY"], "#4a90e2",
          "#c084fc",
        ],
        "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 1],
        "line-opacity": 0.85,
      },
    });

    /* hover highlight */
    map.addLayer({
      id: LAYER_PARCEL_HOVER,
      type: "fill",
      source: SOURCE_PARCELS,
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.08, 0],
      },
    });

    const popup = tooltipRef.current;

    /* hover events */
    map.on("mousemove", LAYER_PARCEL_FILL, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      map.getCanvas().style.cursor = "crosshair";
      const fid = feat.id;

      if (hoveredIdRef.current !== null && hoveredIdRef.current !== fid) {
        map.setFeatureState({ source: SOURCE_PARCELS, id: hoveredIdRef.current }, { hover: false });
      }
      if (fid !== undefined) {
        hoveredIdRef.current = fid as string;
        map.setFeatureState({ source: SOURCE_PARCELS, id: fid }, { hover: true });
      }

      if (popup && feat?.properties) {
        popup
          .setLngLat(e.lngLat)
          .setHTML(buildTooltipHTML(feat.properties as Record<string, unknown>))
          .addTo(map);
      }
    });

    map.on("mouseleave", LAYER_PARCEL_FILL, () => {
      map.getCanvas().style.cursor = "";
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: SOURCE_PARCELS, id: hoveredIdRef.current }, { hover: false });
        hoveredIdRef.current = null;
      }
      popup?.remove();
    });
  }, []);

  /* ── sync markers ─────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const p of projects) {
      seen.add(p.id);
      let marker = markersRef.current.get(p.id);

      if (!marker) {
        const el = createPulseMarker(BAND_COLOR[p.band] ?? "#6b6b6b", p.score);
        el.addEventListener("click", () => onSelect(p.id));
        marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.set(p.id, marker);
      }

      const isActive = activeId === p.id;
      const el = marker.getElement() as HTMLElement;
      const inner = el.children[1] as HTMLElement | undefined;
      const pulse = el.children[0] as HTMLElement | undefined;
      const c = BAND_COLOR[p.band] ?? "#6b6b6b";

      if (inner) {
        inner.style.transform = `scale(${isActive ? 1.25 : 1})`;
        inner.style.boxShadow = isActive
          ? `0 0 0 3px rgba(0,0,0,.5),0 4px 20px ${c}`
          : `0 0 0 2px rgba(0,0,0,.35),0 2px 10px ${c}60`;
      }
      if (pulse) {
        pulse.style.animationDuration = isActive ? "1.4s" : "2.5s";
        pulse.style.opacity = isActive ? "0.7" : "0.4";
      }
    }

    // cleanup vanished
    for (const [id, m] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [projects, activeId, onSelect]);

  /* ── pan + load parcels when active project changes ──────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeId) {
      const p = projects.find((x) => x.id === activeId);
      if (p) {
        map.flyTo({ center: [p.lng, p.lat], zoom: 12.5, speed: 0.85, curve: 1.2 });
      }
    }

    const onLoad = () => loadParcelLayer(activeId);
    if (map.isStyleLoaded()) {
      void loadParcelLayer(activeId);
    } else {
      map.once("load", onLoad);
      return () => { map.off("load", onLoad); };
    }
  }, [activeId, projects, loadParcelLayer]);

  if (mapError) {
    return (
      <FallbackMap
        projects={projects}
        activeId={activeId}
        onSelect={onSelect}
      />
    );
  }

  return <div ref={containerRef} className="absolute inset-0" />;
}

function FallbackMap({
  projects,
  activeId,
  onSelect,
}: {
  projects: RadarProject[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const bounds = useMemo(() => {
    if (projects.length === 0) return { minLat: 28, maxLat: 31, minLng: -94, maxLng: -88 };
    const latitudes = projects.map((project) => project.lat);
    const longitudes = projects.map((project) => project.lng);
    return {
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes),
    };
  }, [projects]);

  const spanLat = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  const spanLng = Math.max(bounds.maxLng - bounds.minLng, 0.01);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#11100d]">
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(201,122,22,.22),transparent_32%),radial-gradient(circle_at_62%_52%,rgba(16,163,127,.16),transparent_28%)]" />
      <div className="absolute left-5 top-[220px] max-w-[320px] rounded-lg border border-white/15 bg-black/65 px-4 py-3 text-white shadow-xl backdrop-blur-md max-lg:top-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Map renderer fallback
        </div>
        <div className="mt-1 text-[17px] font-semibold leading-tight">Project positions are shown without WebGL</div>
        <div className="mt-1.5 text-[12px] leading-5 text-white/58">
          Interactive satellite tiles are unavailable in this browser session; alert triage and project drilldowns remain active.
        </div>
      </div>
      {projects.map((project) => {
        const active = project.id === activeId;
        const left = ((project.lng - bounds.minLng) / spanLng) * 72 + 14;
        const top = (1 - (project.lat - bounds.minLat) / spanLat) * 56 + 22;
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelect(project.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 text-white shadow-xl transition-transform hover:scale-110"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              background: BAND_COLOR[project.band] ?? "#6b6b6b",
              width: active ? 48 : 38,
              height: active ? 48 : 38,
            }}
            title={project.name}
          >
            <span className="font-mono text-[11px] font-bold">{project.score}</span>
          </button>
        );
      })}
    </div>
  );
}
