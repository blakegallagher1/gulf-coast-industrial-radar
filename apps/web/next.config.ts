import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
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
