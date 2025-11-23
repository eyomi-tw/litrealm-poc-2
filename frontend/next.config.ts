import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Uncomment if TypeScript errors still block the build
    // ignoreBuildErrors: true,
  },
};

export default nextConfig;
