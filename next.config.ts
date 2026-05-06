import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.thesportsdb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "r2.thesportsdb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "v3.football.api-sports.io",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
