import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Multipart overhead sits above the 10 MB file limit enforced by
    // validateKundliReportFile; this lets the application validator decide.
    serverActions: {
      bodySizeLimit: "11mb"
    }
  }
};

export default nextConfig;
