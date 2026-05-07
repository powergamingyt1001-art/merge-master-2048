import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for deployment anywhere (Vercel, Netlify, etc.)
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
