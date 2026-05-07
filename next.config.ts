import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  /* Static export for Capacitor Android build */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Ensure trailing slashes for Capacitor compatibility
  trailingSlash: true,
};

export default nextConfig;
