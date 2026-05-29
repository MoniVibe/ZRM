import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ───────────────────────────────────────────────────────────────────

// Categories for a company's tech stack. This is the first-class data of the
// app, so the taxonomy lives here rather than as a free-text field.
export const techCategory = pgEnum("tech_category", [
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

// How sure are we that they actually use this? Drives the sales signal quality.
export const confidence = pgEnum("confidence", [
  "confirmed",
  "likely",
  "rumored",
]);

export const sizeBucket = pgEnum("size_bucket", [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
]);

export const interactionKind = pgEnum("interaction_kind", [
  "note",
  "call",
  "email",
  "meeting",
]);

// ── Tables ────────────────────────────────────────────────────────────────────
// Every row carries org_id. Today it's always 1 (single user). When we add
// auth/multi-tenancy later, this column is already here — no migration, just
// start scoping queries by the logged-in user's org.

export const orgs = pgTable("orgs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  name: text("name").notNull(),
  domain: text("domain"),
  website: text("website"),
  industry: text("industry"),
  size: sizeBucket("size"),
  hqLocation: text("hq_location"),
  description: text("description"),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const techStackItems = pgTable("tech_stack_items", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  category: techCategory("category").notNull().default("other"),
  name: text("name").notNull(), // e.g. "Datadog", "PostgreSQL", "Kubernetes"
  vendor: text("vendor"),
  confidence: confidence("confidence").notNull().default("likely"),
  source: text("source"), // where we learned it: job post, call, BuiltWith…
  notes: text("notes"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  linkedin: text("linkedin"),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  kind: interactionKind("kind").notNull().default("note"),
  body: text("body").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Relations (for relational queries) ────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  techStack: many(techStackItems),
  contacts: many(contacts),
  interactions: many(interactions),
}));

export const techStackItemsRelations = relations(techStackItems, ({ one }) => ({
  company: one(companies, {
    fields: [techStackItems.companyId],
    references: [companies.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  interactions: many(interactions),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  company: one(companies, {
    fields: [interactions.companyId],
    references: [companies.id],
  }),
  contact: one(contacts, {
    fields: [interactions.contactId],
    references: [contacts.id],
  }),
}));

// ── Inferred types ────────────────────────────────────────────────────────────

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type TechStackItem = typeof techStackItems.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
