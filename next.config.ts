import type { NextConfig } from "next";

/* Served from the root of itsmikato.github.io, so no basePath is needed */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
