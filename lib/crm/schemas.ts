import { z } from "zod";

// Shared input schemas for CRM operations. Used by the /api/crm RPC route to
// validate incoming calls. The enum value lists mirror lib/db/schema.ts.
//
// Kept free of "server-only" and any database import so this module is safe to
// reuse anywhere (the MCP server defines its own equivalents to stay decoupled
// across the process boundary).

export const techCategoryEnum = z.enum([
  "cloud",
  "language",
  "framework",
  "database",
  "datastore",
  "devops",
  "observability",
  "security",
  "analytics",
  "collaboration",
  "crm",
  "other",
]);

export const confidenceEnum = z.enum(["confirmed", "likely", "rumored"]);

export const sizeEnum = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
]);

export const interactionKindEnum = z.enum(["note", "call", "email", "meeting"]);

export const SearchInputSchema = z
  .object({
    search: z.string().max(200).optional(),
    tech: z.string().max(100).optional(),
  })
  .strict();

export const IdInputSchema = z
  .object({ id: z.number().int().positive() })
  .strict();

export const CompanyCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    domain: z.string().max(200).optional(),
    website: z.string().max(500).optional(),
    industry: z.string().max(200).optional(),
    size: sizeEnum.optional(),
    hqLocation: z.string().max(200).optional(),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  })
  .strict();

export const CompanyUpdateSchema = CompanyCreateSchema.partial()
  .extend({ id: z.number().int().positive() })
  .strict();

export const TechItemCreateSchema = z
  .object({
    companyId: z.number().int().positive(),
    name: z.string().min(1).max(200),
    category: techCategoryEnum.default("other"),
    confidence: confidenceEnum.default("likely"),
    vendor: z.string().max(200).optional(),
    source: z.string().max(300).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const ContactCreateSchema = z
  .object({
    companyId: z.number().int().positive(),
    name: z.string().min(1).max(200),
    title: z.string().max(200).optional(),
    email: z.string().email().max(200).optional(),
    phone: z.string().max(50).optional(),
    linkedin: z.string().max(300).optional(),
  })
  .strict();

export const InteractionCreateSchema = z
  .object({
    companyId: z.number().int().positive(),
    kind: interactionKindEnum.default("note"),
    body: z.string().min(1).max(5000),
  })
  .strict();

export type SearchInput = z.infer<typeof SearchInputSchema>;
export type CompanyCreate = z.infer<typeof CompanyCreateSchema>;
export type CompanyUpdate = z.infer<typeof CompanyUpdateSchema>;
export type TechItemCreate = z.infer<typeof TechItemCreateSchema>;
export type ContactCreate = z.infer<typeof ContactCreateSchema>;
export type InteractionCreate = z.infer<typeof InteractionCreateSchema>;
