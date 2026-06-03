import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        // Never cache the service worker, so updates are picked up immediately.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    // The FastAPI proxy is for local development only. In production (e.g. on
    // Vercel) there is no backend on :8000, so skip it and let Next's own
    // /api route handlers serve those paths.
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*", // Proxy to FastAPI Backend (dev)
      },
    ];
  },
};

export default nextConfig;
