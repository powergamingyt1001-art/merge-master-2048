import type { NextConfig } from "next";

const isGitHubPages = process.env.DEPLOY_TARGET === "github-pages";

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
  // GitHub Pages needs basePath for repo subdirectory
  ...(isGitHubPages ? { basePath: "/merge-master-2048" } : {}),
};

export default nextConfig;
