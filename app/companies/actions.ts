"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  techStackItems,
  contacts,
  interactions,
} from "@/lib/db/schema";
import { currentOrgId } from "@/lib/org";

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function createCompany(formData: FormData) {
  const db = await getDb();
  const name = str(formData.get("name"));
  if (!name) throw new Error("Company name is required");

  const tagsRaw = str(formData.get("tags"));
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const [row] = await db
    .insert(companies)
    .values({
      orgId: currentOrgId(),
      name,
      domain: str(formData.get("domain")),
      website: str(formData.get("website")),
      industry: str(formData.get("industry")),
      // size is an enum; empty -> null
      size: (str(formData.get("size")) as never) ?? null,
      hqLocation: str(formData.get("hqLocation")),
      description: str(formData.get("description")),
      tags,
    })
    .returning({ id: companies.id });

  revalidatePath("/");
  redirect(`/companies/${row.id}`);
}

export async function addTechItem(formData: FormData) {
  const db = await getDb();
  const companyId = Number(formData.get("companyId"));
  const name = str(formData.get("name"));
  if (!companyId || !name) throw new Error("Missing tech name");

  await db.insert(techStackItems).values({
    orgId: currentOrgId(),
    companyId,
    name,
    category: (str(formData.get("category")) as never) ?? "other",
    confidence: (str(formData.get("confidence")) as never) ?? "likely",
    vendor: str(formData.get("vendor")),
    source: str(formData.get("source")),
    notes: str(formData.get("notes")),
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteTechItem(formData: FormData) {
  const db = await getDb();
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  await db
    .delete(techStackItems)
    .where(
      and(
        eq(techStackItems.id, id),
        eq(techStackItems.orgId, currentOrgId()),
      ),
    );
  revalidatePath(`/companies/${companyId}`);
}

export async function addContact(formData: FormData) {
  const db = await getDb();
  const companyId = Number(formData.get("companyId"));
  const name = str(formData.get("name"));
  if (!companyId || !name) throw new Error("Missing contact name");

  await db.insert(contacts).values({
    orgId: currentOrgId(),
    companyId,
    name,
    title: str(formData.get("title")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    linkedin: str(formData.get("linkedin")),
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function addInteraction(formData: FormData) {
  const db = await getDb();
  const companyId = Number(formData.get("companyId"));
  const body = str(formData.get("body"));
  if (!companyId || !body) throw new Error("Missing interaction body");

  await db.insert(interactions).values({
    orgId: currentOrgId(),
    companyId,
    kind: (str(formData.get("kind")) as never) ?? "note",
    body,
  });

  revalidatePath(`/companies/${companyId}`);
}
