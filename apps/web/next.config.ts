import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    root: workspaceRoot,
  },
  outputFileTracingRoot: workspaceRoot,
  // Auth middleware lives at apps/web/middleware.ts (Next.js 16 convention).
  transpilePackages: [
    "@gcir/db",
    "@gcir/adapters",
    "@gcir/agents",
    "@gcir/scoring",
    "@gcir/shared",
  ],
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
      { protocol: "https", hostname: "*.basemaps.cartocdn.com" },
      { protocol: "https", hostname: "server.arcgisonline.com" },
    ],
  },
};

export default nextConfig;
