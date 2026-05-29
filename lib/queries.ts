import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { companies, techStackItems } from "./db/schema";
import { currentOrgId } from "./org";

// All reads/writes go through here so org-scoping is enforced in exactly one
// place. Pages and server actions never touch the db client directly.

export type CompanyListItem = {
  id: number;
  name: string;
  industry: string | null;
  size: string | null;
  domain: string | null;
  tags: string[];
  stackCount: number;
};

/**
 * List companies for the current org, with an optional free-text search and an
 * optional filter by a tech-stack item name (e.g. "Datadog").
 */
export async function listCompanies(opts: {
  search?: string;
  tech?: string;
}): Promise<CompanyListItem[]> {
  const db = await getDb();
  const org = currentOrgId();
  const { search, tech } = opts;

  const filters = [eq(companies.orgId, org)];
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    filters.push(
      or(
        ilike(companies.name, q),
        ilike(companies.industry, q),
        ilike(companies.domain, q),
      )!,
    );
  }

  // Subquery: count of stack items per company (also used to filter by tech).
  const stackCount = sql<number>`(
    select count(*) from ${techStackItems} tsi
    where tsi.company_id = ${companies.id}
  )`.as("stack_count");

  if (tech && tech.trim()) {
    const t = `%${tech.trim()}%`;
    filters.push(
      sql`exists (
        select 1 from ${techStackItems} tsi
        where tsi.company_id = ${companies.id}
        and tsi.name ilike ${t}
      )`,
    );
  }

  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
      size: companies.size,
      domain: companies.domain,
      tags: companies.tags,
      stackCount,
    })
    .from(companies)
    .where(and(...filters))
    .orderBy(companies.name);

  return rows.map((r) => ({ ...r, stackCount: Number(r.stackCount) }));
}

/** Full company record with stack, contacts, and interaction history. */
export async function getCompany(id: number) {
  const db = await getDb();
  const org = currentOrgId();

  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, id), eq(companies.orgId, org)),
    with: {
      techStack: true,
      contacts: true,
      interactions: {
        orderBy: (i, { desc }) => [desc(i.occurredAt)],
      },
    },
  });

  return company ?? null;
}

/** Distinct tech names across the org — powers the filter dropdown. */
export async function listKnownTech(): Promise<string[]> {
  const db = await getDb();
  const org = currentOrgId();
  const rows = await db
    .selectDistinct({ name: techStackItems.name })
    .from(techStackItems)
    .where(eq(techStackItems.orgId, org))
    .orderBy(techStackItems.name);
  return rows.map((r) => r.name);
}
