import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb, closeDb, usingPglite } from "./index";
import {
  orgs,
  companies,
  techStackItems,
  contacts,
  interactions,
} from "./schema";

// Idempotent-ish seed: wipes app data and inserts a couple of demo companies so
// the UI has something to show on first run. Safe to re-run.
//
// Uses the shared getDb(), which auto-runs migrations on the PGlite path — so a
// fresh local DB is created and populated in one command.

async function main() {
  const db = await getDb();
  console.log(
    usingPglite
      ? "Using local PGlite database (./.pglite)…"
      : "Using configured Postgres database…",
  );

  console.log("Clearing existing data…");
  await db.execute(
    sql`truncate table ${interactions}, ${techStackItems}, ${contacts}, ${companies}, ${orgs} restart identity cascade`,
  );

  console.log("Seeding…");
  await db.insert(orgs).values({ id: 1, name: "My workspace" });

  const [acme] = await db
    .insert(companies)
    .values({
      name: "Acme Analytics",
      domain: "acme.io",
      website: "https://acme.io",
      industry: "Data / SaaS",
      size: "201-500",
      hqLocation: "Austin, TX",
      description:
        "Mid-market analytics platform. Heard they're consolidating observability vendors this year.",
      tags: ["prospect", "enterprise", "warm"],
    })
    .returning();

  const [globex] = await db
    .insert(companies)
    .values({
      name: "Globex Logistics",
      domain: "globex.com",
      industry: "Logistics",
      size: "1000+",
      hqLocation: "Chicago, IL",
      description: "Legacy stack, slow procurement. Long sales cycle.",
      tags: ["cold", "enterprise"],
    })
    .returning();

  await db.insert(techStackItems).values([
    {
      companyId: acme.id,
      category: "cloud",
      name: "AWS",
      confidence: "confirmed",
      source: "case study",
    },
    {
      companyId: acme.id,
      category: "observability",
      name: "Datadog",
      confidence: "likely",
      source: "job posting",
      notes: "Hiring an SRE 'with Datadog experience'.",
    },
    {
      companyId: acme.id,
      category: "database",
      name: "PostgreSQL",
      confidence: "confirmed",
      source: "eng blog",
    },
    {
      companyId: acme.id,
      category: "devops",
      name: "Kubernetes",
      confidence: "likely",
      source: "job posting",
    },
    {
      companyId: globex.id,
      category: "cloud",
      name: "On-prem / VMware",
      confidence: "rumored",
      source: "discovery call",
    },
    {
      companyId: globex.id,
      category: "language",
      name: "Java",
      confidence: "confirmed",
      source: "discovery call",
    },
  ]);

  const [champion] = await db
    .insert(contacts)
    .values({
      companyId: acme.id,
      name: "Dana Reyes",
      title: "VP Engineering",
      email: "dana@acme.io",
      isPrimary: true,
    })
    .returning();

  await db.insert(interactions).values([
    {
      companyId: acme.id,
      contactId: champion.id,
      kind: "call",
      body: "Intro call with Dana. Pain point: alert fatigue across 3 monitoring tools. Open to a pilot in Q3.",
    },
    {
      companyId: acme.id,
      kind: "note",
      body: "Saw a LinkedIn post — they just closed a Series B. Budget likely freeing up.",
    },
  ]);

  console.log("Done. Seeded 2 companies.");
  await closeDb();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await closeDb().catch(() => {});
  process.exit(1);
});
