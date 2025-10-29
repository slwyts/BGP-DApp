import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
} as NextConfig;

export default nextConfig;
