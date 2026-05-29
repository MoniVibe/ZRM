import "server-only";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  techStackItems,
  contacts,
  interactions,
} from "@/lib/db/schema";
import { currentOrgId } from "@/lib/org";
import type {
  CompanyCreate,
  CompanyUpdate,
  TechItemCreate,
  ContactCreate,
  InteractionCreate,
  SearchInput,
} from "./schemas";

// The single source of truth for CRM operations. Both the web UI (via server
// actions) and the agent interface (via the /api/crm RPC route -> MCP server)
// call these functions, so business logic and org-scoping live in one place.

export type CompanyListItem = {
  id: number;
  name: string;
  industry: string | null;
  size: string | null;
  domain: string | null;
  tags: string[];
  stackCount: number;
};

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listCompanies(
  opts: SearchInput,
): Promise<CompanyListItem[]> {
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
      stackCount: sql<number>`count(${techStackItems.id})`,
    })
    .from(companies)
    .leftJoin(techStackItems, eq(techStackItems.companyId, companies.id))
    .where(and(...filters))
    .groupBy(companies.id)
    .orderBy(companies.name);

  return rows.map((r) => ({ ...r, stackCount: Number(r.stackCount) }));
}

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

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createCompany(input: CompanyCreate) {
  const db = await getDb();
  const [row] = await db
    .insert(companies)
    .values({
      orgId: currentOrgId(),
      name: input.name,
      domain: input.domain ?? null,
      website: input.website ?? null,
      industry: input.industry ?? null,
      size: input.size ?? null,
      hqLocation: input.hqLocation ?? null,
      description: input.description ?? null,
      tags: input.tags ?? [],
    })
    .returning();
  return row;
}

export async function updateCompany(input: CompanyUpdate) {
  const db = await getDb();
  const { id, ...fields } = input;
  // Only set keys that were actually provided.
  const patch: Record<string, unknown> = { updatedAt: sql`now()` };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) patch[k] = v;
  }
  const [row] = await db
    .update(companies)
    .set(patch)
    .where(and(eq(companies.id, id), eq(companies.orgId, currentOrgId())))
    .returning();
  return row ?? null;
}

export async function addTechItem(input: TechItemCreate) {
  const db = await getDb();
  const [row] = await db
    .insert(techStackItems)
    .values({
      orgId: currentOrgId(),
      companyId: input.companyId,
      name: input.name,
      category: input.category,
      confidence: input.confidence,
      vendor: input.vendor ?? null,
      source: input.source ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function removeTechItem(id: number) {
  const db = await getDb();
  const rows = await db
    .delete(techStackItems)
    .where(
      and(eq(techStackItems.id, id), eq(techStackItems.orgId, currentOrgId())),
    )
    .returning({ id: techStackItems.id });
  return rows.length > 0;
}

export async function deleteCompany(id: number) {
  const db = await getDb();
  const rows = await db
    .delete(companies)
    .where(and(eq(companies.id, id), eq(companies.orgId, currentOrgId())))
    .returning({ id: companies.id });
  return rows.length > 0;
}

export async function addContact(input: ContactCreate) {
  const db = await getDb();
  const [row] = await db
    .insert(contacts)
    .values({
      orgId: currentOrgId(),
      companyId: input.companyId,
      name: input.name,
      title: input.title ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      linkedin: input.linkedin ?? null,
    })
    .returning();
  return row;
}

export async function logInteraction(input: InteractionCreate) {
  const db = await getDb();
  const [row] = await db
    .insert(interactions)
    .values({
      orgId: currentOrgId(),
      companyId: input.companyId,
      kind: input.kind,
      body: input.body,
    })
    .returning();
  return row;
}
