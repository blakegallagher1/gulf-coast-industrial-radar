import { ImageResponse } from "next/og";
import { prisma } from "@gcir/db";

export const runtime = "nodejs";
export const alt = "Project Score Card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } })
    ?? await prisma.project.findFirst({ where: { publicId: id } });

  if (!project) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0d0d0d", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
        Project not found
      </div>,
      { ...size },
    );
  }

  const bandColor = project.score >= 80 ? "#b3261e" : project.score >= 60 ? "#c97a16" : project.score >= 40 ? "#1f5fa8" : "#6b6b6b";
  const bandLabel = project.score >= 80 ? "HIGH" : project.score >= 60 ? "ELEVATED" : project.score >= 40 ? "WATCH" : "WEAK";

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#0d0d0d", color: "#fff", padding: 60, flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 30 }}>
        <div style={{ display: "flex", width: 120, height: 120, borderRadius: 20, background: bandColor, alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 700 }}>
          {project.score}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: "#8e8e8e" }}>
            Formation Score · {bandLabel}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1 }}>
            {project.name}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 18, color: "#8e8e8e", marginTop: 4 }}>
            <span>{project.parishCounty}, {project.state}</span>
            {project.corridor && <span>· {project.corridor}</span>}
            <span>· {project.stage.toLowerCase().replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: "#6b6b6b" }}>
          Gulf Coast Industrial Radar · gulfcoastradar.com
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#10a37f", background: "rgba(16,163,127,0.1)", borderRadius: 8, padding: "8px 16px" }}>
          See full analysis →
        </div>
      </div>
    </div>,
    { ...size },
  );
}
