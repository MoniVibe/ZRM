import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Two drivers, one interface:
//   • DATABASE_URL set  → real Postgres (postgres-js). The production path.
//   • DATABASE_URL unset → local PGlite, an in-process Postgres persisted to
//     ./.pglite. Zero setup, perfect for iterating locally.
//
// getDb() is async because the PGlite path runs migrations on first use.

export const databaseUrl = process.env.DATABASE_URL;
export const usingPglite = !databaseUrl;
// We always have a database now (PGlite is the fallback), so the UI never has
// to show a "no database" screen — only a genuine connection error if a real
// DATABASE_URL is set but unreachable.
export const isDbConfigured = true;

// Both drivers expose the same Drizzle query API at runtime, so we present a
// single concrete type to callers (the PGlite instance is cast to it). This
// avoids a union type that TypeScript can't reconcile across the two drivers.
type DB = PostgresJsDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var _dbPromise: Promise<DB> | undefined;
  // eslint-disable-next-line no-var
  var _pgClient: import("postgres").Sql | undefined;
  // eslint-disable-next-line no-var
  var _pglite: import("@electric-sql/pglite").PGlite | undefined;
}

async function init(): Promise<DB> {
  if (usingPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    global._pglite ??= new PGlite(".pglite");
    const db = drizzle(global._pglite, { schema });
    // Idempotent — drizzle records applied migrations in __drizzle_migrations.
    await migrate(db, { migrationsFolder: "./drizzle" });
    return db as unknown as DB;
  }

  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  global._pgClient ??= postgres(databaseUrl!, { max: 5 });
  return drizzle(global._pgClient, { schema });
}

export function getDb(): Promise<DB> {
  global._dbPromise ??= init();
  return global._dbPromise;
}

// For one-off scripts (e.g. seed) that need the process to exit cleanly.
export async function closeDb() {
  if (global._pglite) {
    await global._pglite.close();
    global._pglite = undefined;
  }
  if (global._pgClient) {
    await global._pgClient.end();
    global._pgClient = undefined;
  }
  global._dbPromise = undefined;
}

export { schema };
