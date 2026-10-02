import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/": ["./data/exame_maiores_2026_1000_empresas.csv"],
  },
};

export default nextConfig;
