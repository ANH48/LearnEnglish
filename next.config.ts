import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every admin and learner page depends on the signed-in account, so pages are
  // rendered per request. Cache Components (static shells) is left off on purpose.
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
