import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Evidence is 6 MB/file; server validates <=8 files and <=20 MB total.
      // Leave room for multipart metadata instead of rejecting valid 6 MB files.
      bodySizeLimit: "24mb",
    },
  },
};

export default nextConfig;
