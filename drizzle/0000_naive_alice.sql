CREATE TYPE "public"."confidence" AS ENUM('confirmed', 'likely', 'rumored');--> statement-breakpoint
CREATE TYPE "public"."interaction_kind" AS ENUM('note', 'call', 'email', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."size_bucket" AS ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+');--> statement-breakpoint
CREATE TYPE "public"."tech_category" AS ENUM('cloud', 'language', 'framework', 'database', 'datastore', 'devops', 'observability', 'security', 'analytics', 'collaboration', 'crm', 'other');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"website" text,
	"industry" text,
	"size" "size_bucket",
	"hq_location" text,
	"description" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"linkedin" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"company_id" integer NOT NULL,
	"contact_id" integer,
	"kind" "interaction_kind" DEFAULT 'note' NOT NULL,
	"body" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tech_stack_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"company_id" integer NOT NULL,
	"category" "tech_category" DEFAULT 'other' NOT NULL,
	"name" text NOT NULL,
	"vendor" text,
	"confidence" "confidence" DEFAULT 'likely' NOT NULL,
	"source" text,
	"notes" text,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_stack_items" ADD CONSTRAINT "tech_stack_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;