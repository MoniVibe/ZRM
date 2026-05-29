import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM and uses Node APIs — keep it out of the bundler so it's
  // loaded as a normal Node dependency at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
