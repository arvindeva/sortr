import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Self-hosted on Railway's ephemeral disk: the file-based ISR/data cache
    // grows without eviction (one file per ranking forever, ~3 per visited
    // page) until it hits Railway's file-count cap and the deployment gets
    // flagged for removal (happened 2026-08-27). Keep the cache in the
    // in-memory LRU instead — bounded, and reset on each deploy.
    isrFlushToDisk: false,
  },
};

export default nextConfig;
