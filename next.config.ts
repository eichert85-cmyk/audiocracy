import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NEXT_PUBLIC_SITE_URL?.includes("ngrok-free")) {
      return [
        {
          source: "/_next/:path*",
          destination: `${process.env.NEXT_PUBLIC_SITE_URL}/_next/:path*`,
        },
      ];
    }

    return [];
  },
};

export default nextConfig;
