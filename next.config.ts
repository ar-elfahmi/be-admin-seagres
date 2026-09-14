import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Foto lot dibatasi 4 MB di createLot; default 1 MB akan gagal diam-diam.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
