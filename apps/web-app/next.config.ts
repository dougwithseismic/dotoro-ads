import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Workers
  output: "standalone",
};

export default nextConfig;
