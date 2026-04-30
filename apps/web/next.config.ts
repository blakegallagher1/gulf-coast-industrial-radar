import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // The middleware lives at apps/web/proxy.ts (Roux convention) — Next.js
  // auto-detects it because of the explicit middleware export.
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
