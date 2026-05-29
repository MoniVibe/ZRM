"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCompany as svcCreateCompany,
  addTechItem as svcAddTechItem,
  removeTechItem as svcRemoveTechItem,
  addContact as svcAddContact,
  logInteraction as svcLogInteraction,
} from "@/lib/crm/service";
import {
  CompanyCreateSchema,
  TechItemCreateSchema,
  ContactCreateSchema,
  InteractionCreateSchema,
} from "@/lib/crm/schemas";

// Server actions are thin adapters: turn FormData into a plain object, validate
// with the shared schema, then delegate to the service layer (same code the
// agent/API path uses).

function opt(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : undefined;
}

export async function createCompany(formData: FormData) {
  const tagsRaw = opt(formData.get("tags"));
  const input = CompanyCreateSchema.parse({
    name: opt(formData.get("name")),
    domain: opt(formData.get("domain")),
    website: opt(formData.get("website")),
    industry: opt(formData.get("industry")),
    size: opt(formData.get("size")),
    hqLocation: opt(formData.get("hqLocation")),
    description: opt(formData.get("description")),
    tags: tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined,
  });
  const row = await svcCreateCompany(input);
  revalidatePath("/");
  redirect(`/companies/${row.id}`);
}

export async function addTechItem(formData: FormData) {
  const input = TechItemCreateSchema.parse({
    companyId: Number(formData.get("companyId")),
    name: opt(formData.get("name")),
    category: opt(formData.get("category")),
    confidence: opt(formData.get("confidence")),
    vendor: opt(formData.get("vendor")),
    source: opt(formData.get("source")),
    notes: opt(formData.get("notes")),
  });
  await svcAddTechItem(input);
  revalidatePath(`/companies/${input.companyId}`);
}

export async function deleteTechItem(formData: FormData) {
  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  await svcRemoveTechItem(id);
  revalidatePath(`/companies/${companyId}`);
}

export async function addContact(formData: FormData) {
  const input = ContactCreateSchema.parse({
    companyId: Number(formData.get("companyId")),
    name: opt(formData.get("name")),
    title: opt(formData.get("title")),
    email: opt(formData.get("email")),
    phone: opt(formData.get("phone")),
    linkedin: opt(formData.get("linkedin")),
  });
  await svcAddContact(input);
  revalidatePath(`/companies/${input.companyId}`);
}

export async function addInteraction(formData: FormData) {
  const input = InteractionCreateSchema.parse({
    companyId: Number(formData.get("companyId")),
    kind: opt(formData.get("kind")),
    body: opt(formData.get("body")),
  });
  await svcLogInteraction(input);
  revalidatePath(`/companies/${input.companyId}`);
}
