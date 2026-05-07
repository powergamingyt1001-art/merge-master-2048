import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel deployment — no static export needed
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
