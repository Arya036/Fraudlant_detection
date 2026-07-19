import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      // Proxy /console/* → Vite React investigation console (port 5173)
      {
        source: "/console",
        destination: "http://localhost:5173/",
      },
      {
        source: "/console/:path*",
        destination: "http://localhost:5173/:path*",
      },
      // Proxy /api/aml/* → FastAPI backend (port 8000)
      {
        source: "/api/aml/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
