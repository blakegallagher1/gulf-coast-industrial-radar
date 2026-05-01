"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Marker } from "maplibre-gl";
import { BAND_COLOR } from "@gcir/shared";
import type { RadarProject } from "./RadarShell";

const VOYAGER = {
  version: 8 as const,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "carto-voyager": {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: "carto", type: "raster" as const, source: "carto-voyager" }],
};

export function RadarMap({
  projects,
  activeId,
  onSelect,
}: {
  projects: RadarProject[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: VOYAGER as never,
      center: [-91.5, 30.2],
      zoom: 7.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    for (const p of projects) {
      seen.add(p.id);
      let marker = markersRef.current.get(p.id);
      if (!marker) {
        const el = document.createElement("div");
        el.dataset.id = p.id;
        el.addEventListener("click", () => onSelect(p.id));
        marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.set(p.id, marker);
      }
      const el = marker.getElement();
      const isActive = activeId === p.id;
      const c = BAND_COLOR[p.band] ?? "#6b6b6b";
      el.className = "gcir-marker";
      el.style.cssText = `
        width:32px;height:32px;border-radius:50%;background:#fff;
        border:2px solid ${c};display:flex;align-items:center;justify-content:center;
        font-family:JetBrains Mono,monospace;font-weight:700;font-size:11px;
        color:${c};cursor:pointer;
        box-shadow:${isActive
          ? "0 4px 12px rgba(179,38,30,0.25),0 0 0 4px rgba(255,255,255,0.9)"
          : "0 2px 6px rgba(0,0,0,0.15),0 0 0 4px rgba(255,255,255,0.7)"};
        transform:scale(${isActive ? 1.15 : 1});
        transition:transform .15s ease,box-shadow .15s ease;
      `;
      el.textContent = String(p.score);
    }

    // cleanup vanished
    for (const [id, m] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }

    // pan to active
    if (activeId) {
      const p = projects.find((x) => x.id === activeId);
      if (p) map.flyTo({ center: [p.lng, p.lat], zoom: 11.2, speed: 0.7 });
    }
  }, [projects, activeId, onSelect]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
