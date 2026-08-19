import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/starship-prompt-builder",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
