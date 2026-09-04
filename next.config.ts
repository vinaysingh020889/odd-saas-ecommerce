import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" }
        ]
      }
    ];
  },
  experimental: {
    // Multipart overhead sits above the 10 MB file limit enforced by
    // validateKundliReportFile; this lets the application validator decide.
    serverActions: {
      bodySizeLimit: "11mb"
    }
  }
};

export default nextConfig;
