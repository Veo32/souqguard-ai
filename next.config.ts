import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the tracing root to this project directory so traced files keep
  // project-relative paths in the standalone/serverless output, whether the
  // project sits at the deployment root (Vercel) or inside a nested folder.
  outputFileTracingRoot: __dirname,
  // Bundle the SQLite database with the API routes so it is available in
  // serverless deployments (Vercel). At runtime src/lib/db.ts copies it to
  // /tmp, the only writable location on serverless functions.
  outputFileTracingIncludes: {
    "/api/**": ["./db/custom.db"],
  },
  reactStrictMode: false,
};

export default nextConfig;
