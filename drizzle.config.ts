import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// If DATABASE_URL is set we target real Postgres. Otherwise we fall back to a
// local PGlite database at ./.pglite so the app works with zero setup.
const url = process.env.DATABASE_URL;

export default defineConfig(
  url
    ? {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: { url },
        verbose: true,
        strict: true,
      }
    : {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        driver: "pglite",
        dbCredentials: { url: ".pglite" },
        verbose: true,
        strict: true,
      },
);
