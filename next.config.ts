import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all domains for now as mock data URLs are random
      },
    ],
  },
  // Increase body size limit for file uploads (10MB + buffer for processing)
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb', // Allow up to 15MB to account for processing overhead
    },
  },
};

export default nextConfig;
