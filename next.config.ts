import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 produces a fully static site in ./out (GitHub Pages, S3, any static host).
 * NEXT_PUBLIC_BASE_PATH is the sub-path the site is served from, e.g. "/srh-platform" for
 * https://<user>.github.io/srh-platform. Leave it empty when serving from a domain root.
 */
const isExport = process.env.STATIC_EXPORT === "1" || process.env.npm_lifecycle_event === "build:static";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  // Lets a production build run beside `next dev` without sharing the .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  ...(isExport ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
