import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@node-rs/crc32", "yauzl-promise"],
};

export default nextConfig;
