import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: export since webframeworks handles deployment
  // Firebase will automatically handle SSR/SSG through Cloud Functions
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
