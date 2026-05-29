#!/usr/bin/env node
/**
 * StackCRM MCP server.
 *
 * Exposes the CRM as agent tools over stdio (for Claude Desktop, Claude Code,
 * etc.). It does NOT touch the database directly — it calls the running
 * StackCRM app's local RPC endpoint (POST /api/crm), so the app stays the single
 * owner of the (PGlite) database and there's no multi-process contention.
 *
 * Requires the StackCRM app to be running (launch it first). Configure with:
 *   STACKCRM_API_URL    base URL of the app (default http://localhost:3000)
 *   STACKCRM_API_TOKEN  optional shared secret, if the app sets one
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.STACKCRM_API_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const API_TOKEN = process.env.STACKCRM_API_TOKEN;

/** Call the StackCRM RPC endpoint. Throws an actionable error on failure. */
async function call(op: string, args?: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/crm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { "x-stackcrm-token": API_TOKEN } : {}),
      },
      body: JSON.stringify({ op, args }),
    });
  } catch {
    throw new Error(
      `Could not reach StackCRM at ${API_URL}. Is the app running? Start it with the "Launch StackCRM" shortcut, then try again.`,
    );
  }

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: unknown;
    error?: string;
    details?: unknown;
  };
  if (!res.ok || !json.ok) {
    const detail = json.details ? ` ${JSON.stringify(json.details)}` : "";
    throw new Error(json.error ? `${json.error}.${detail}` : `Request failed (HTTP ${res.status}).`);
  }
  return json.data;
}

/** Wrap a service result as an MCP text response. */
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(e: unknown) {
  return {
    content: [
      { type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` },
    ],
    isError: true,
  };
}

// Sent to the agent on connect (the MCP `instructions` field). Keep it concise
// — it lives in the agent's context. Depth lives in the `stackcrm://guide`
// resource below.
const INSTRUCTIONS = `StackCRM is a CRM for someone who sells technical products INTO companies. The central record is a COMPANY, and its TECH STACK is the headline data: which tools/platforms a company uses, each with a confidence (confirmed | likely | rumored) and a source (where it was learned, e.g. "job posting", "discovery call").

Maintain the CRM from natural-language requests. Core workflow:
- FIND before you write: call stackcrm_search_companies (by name/industry/domain, or filter by a tech name), then stackcrm_get_company with the returned id for the full record (tech stack, contacts, interactions). Search before creating to avoid duplicates.
- RECORD TECH with stackcrm_add_tech whenever a company's technology comes up: include the company id and tech name; set category, confidence, and a short source when known. This is the most valuable data in the system.
- LOG TOUCHES with stackcrm_log_interaction (call/email/meeting/note) so history stays current.
- Only 'name' is required to create a company; fill other fields as you learn them.

Conventions:
- ids are integers returned by search/create — never invent them, look them up first.
- Destructive tools (stackcrm_delete_company, stackcrm_remove_tech) cannot be undone — confirm with the user before using them.
- The StackCRM app must be running. If a tool reports it can't reach the app, ask the user to launch it (the "Launch StackCRM" shortcut), then retry.

Read the resource stackcrm://guide for the full field/enum reference and more workflows. The stackcrm_intake and stackcrm_prep prompts cover the two most common tasks.`;

// Fuller reference, fetched on demand via the guide resource.
const GUIDE = `# StackCRM — agent usage guide

A company-centric CRM for technical sales. The COMPANY is the central record;
its TECH STACK is the headline data used to qualify and engage.

## Data model

**Company** — id (int), name (required), domain, website, industry, size, hqLocation, description, tags (string[]).
**TechStackItem** — id, companyId, name (e.g. "Datadog"), category, confidence, vendor, source, notes.
**Contact** — id, companyId, name (required), title, email, phone, linkedin.
**Interaction** — id, companyId, kind, body, occurredAt.

## Enums

- **category**: cloud, language, framework, database, datastore, devops, observability, security, analytics, collaboration, crm, other
- **confidence**: confirmed, likely, rumored
- **size** (headcount bucket): 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+
- **interaction kind**: note, call, email, meeting

## Tools

Reads: stackcrm_search_companies, stackcrm_get_company, stackcrm_list_tech.
Writes: stackcrm_create_company, stackcrm_update_company, stackcrm_delete_company, stackcrm_add_tech, stackcrm_remove_tech, stackcrm_add_contact, stackcrm_log_interaction.

## Workflows

**Record from notes** — Given freeform notes: search for the company (create if new), add each technology with confidence + source, add contacts, log an interaction. Don't invent facts.

**Update a company** — Search to get the id, then stackcrm_update_company with only the fields that changed.

**Find by technology** — stackcrm_search_companies with \`tech\` set (e.g. "Datadog") returns companies using a matching tech. Use stackcrm_list_tech to see what's recorded.

**Call prep** — Get the full company record and summarize: snapshot, tech-stack signals and implications, gaps to confirm, 2-3 talking points. Use only CRM data.

## Rules

- Look up ids; never fabricate them.
- Set confidence honestly: "confirmed" only with a solid source; "rumored" for hearsay.
- Confirm before any destructive operation.
- The StackCRM app must be running for any tool to work.`;

const server = new McpServer(
  { name: "stackcrm-mcp-server", version: "1.0.0" },
  { instructions: INSTRUCTIONS },
);

// ── Enum shapes (mirror the CRM schema) ───────────────────────────────────────
const category = z
  .enum([
    "cloud", "language", "framework", "database", "datastore", "devops",
    "observability", "security", "analytics", "collaboration", "crm", "other",
  ])
  .describe("Tech category");
const confidence = z
  .enum(["confirmed", "likely", "rumored"])
  .describe("How sure we are they use this");
const size = z
  .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
  .describe("Employee headcount bucket");
const kind = z
  .enum(["note", "call", "email", "meeting"])
  .describe("Kind of interaction");

// ── Read tools ────────────────────────────────────────────────────────────────

server.registerTool(
  "stackcrm_search_companies",
  {
    title: "Search companies",
    description:
      "Search the CRM's companies by free text (name/industry/domain) and/or filter by a tech-stack item name. Returns a list with id, name, industry, size, domain, tags, and tech count. Use this to find a company before getting its full record.",
    inputSchema: {
      search: z.string().max(200).optional().describe("Free text match on name, industry, or domain"),
      tech: z.string().max(100).optional().describe("Only companies that use a tech matching this name (e.g. 'Datadog')"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    try { return ok(await call("listCompanies", args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_get_company",
  {
    title: "Get company",
    description:
      "Get the full record for one company by id: profile fields, full categorized tech stack (with confidence + source), contacts, and interaction history. Use the id from stackcrm_search_companies.",
    inputSchema: { id: z.number().int().positive().describe("Company id") },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    try {
      const data = await call("getCompany", args);
      if (data === null) return { content: [{ type: "text" as const, text: `No company with id ${args.id}.` }] };
      return ok(data);
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_list_tech",
  {
    title: "List known tech",
    description: "List the distinct tech-stack item names recorded across all companies. Useful before filtering a search by tech.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try { return ok(await call("listKnownTech")); } catch (e) { return fail(e); }
  },
);

// ── Write tools ─────────────────────────────────────────────────────────────

server.registerTool(
  "stackcrm_create_company",
  {
    title: "Create company",
    description:
      "Add a new company to the CRM. Only 'name' is required. Returns the created record including its new id. Tags are free-form labels (e.g. 'prospect', 'enterprise').",
    inputSchema: {
      name: z.string().min(1).max(200).describe("Company name (required)"),
      domain: z.string().max(200).optional().describe("Primary domain, e.g. acme.io"),
      website: z.string().max(500).optional(),
      industry: z.string().max(200).optional(),
      size: size.optional(),
      hqLocation: z.string().max(200).optional().describe("HQ location, e.g. 'Austin, TX'"),
      description: z.string().max(5000).optional().describe("Freeform notes about the company"),
      tags: z.array(z.string().max(50)).max(20).optional().describe("Labels for filtering"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (args) => {
    try { return ok(await call("createCompany", args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_update_company",
  {
    title: "Update company",
    description:
      "Update fields on an existing company. Provide the id plus only the fields to change. Returns the updated record (or null if no company has that id).",
    inputSchema: {
      id: z.number().int().positive().describe("Company id to update"),
      name: z.string().min(1).max(200).optional(),
      domain: z.string().max(200).optional(),
      website: z.string().max(500).optional(),
      industry: z.string().max(200).optional(),
      size: size.optional(),
      hqLocation: z.string().max(200).optional(),
      description: z.string().max(5000).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    try { return ok(await call("updateCompany", args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_delete_company",
  {
    title: "Delete company",
    description:
      "Permanently delete a company and all its tech, contacts, and interactions, by id. This is destructive and cannot be undone. Returns whether a row was removed.",
    inputSchema: { id: z.number().int().positive().describe("Company id to delete") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    try { return ok({ deleted: await call("deleteCompany", args) }); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_add_tech",
  {
    title: "Add tech-stack item",
    description:
      "Record that a company uses a piece of technology. The headline data of this CRM. Specify the company id and tech name; category and confidence default to 'other' and 'likely'. Include a 'source' (e.g. 'job posting', 'discovery call') when known.",
    inputSchema: {
      companyId: z.number().int().positive().describe("Company id this tech belongs to"),
      name: z.string().min(1).max(200).describe("Tech name, e.g. 'Datadog', 'PostgreSQL'"),
      category: category.default("other"),
      confidence: confidence.default("likely"),
      vendor: z.string().max(200).optional(),
      source: z.string().max(300).optional().describe("Where we learned it"),
      notes: z.string().max(2000).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (args) => {
    try { return ok(await call("addTechItem", args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_remove_tech",
  {
    title: "Remove tech-stack item",
    description: "Delete a tech-stack item by its id. This is destructive. Returns whether a row was removed.",
    inputSchema: { id: z.number().int().positive().describe("Tech-stack item id") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    try { return ok({ removed: await call("removeTechItem", args) }); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_add_contact",
  {
    title: "Add contact",
    description: "Add a person at a company. Specify the company id and a name; other fields are optional.",
    inputSchema: {
      companyId: z.number().int().positive().describe("Company id this contact belongs to"),
      name: z.string().min(1).max(200),
      title: z.string().max(200).optional(),
      email: z.string().email().max(200).optional(),
      phone: z.string().max(50).optional(),
      linkedin: z.string().max(300).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (args) => {
    try { return ok(await call("addContact", args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  "stackcrm_log_interaction",
  {
    title: "Log interaction",
    description:
      "Record an interaction with a company (a call, email, meeting, or a freeform note). Specify the company id and a body; kind defaults to 'note'. Use this to capture what was learned or what happened.",
    inputSchema: {
      companyId: z.number().int().positive().describe("Company id"),
      kind: kind.default("note"),
      body: z.string().min(1).max(5000).describe("What happened / what was learned"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (args) => {
    try { return ok(await call("logInteraction", args)); } catch (e) { return fail(e); }
  },
);

// ── Usage guide as a readable resource ───────────────────────────────────────
server.registerResource(
  "guide",
  "stackcrm://guide",
  {
    title: "StackCRM usage guide",
    description:
      "How to interface with StackCRM: data model, fields, enums, and workflows. Read this for the full reference.",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: GUIDE }],
  }),
);

// ── Workflow prompts for the two most common tasks ────────────────────────────
server.registerPrompt(
  "stackcrm_intake",
  {
    title: "Record from notes",
    description:
      "Turn freeform notes about a company into CRM records (company, tech stack, contacts, interaction).",
    argsSchema: {
      notes: z.string().describe("Freeform notes about a company or a sales touch"),
    },
  },
  ({ notes }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are maintaining StackCRM (a tech-stack-first sales CRM) via its MCP tools. From the notes below:
1. Identify the company. Call stackcrm_search_companies first; reuse its id if it exists, otherwise stackcrm_create_company (only 'name' is required).
2. Record each technology with stackcrm_add_tech (company id + name; set category, confidence confirmed/likely/rumored, and a short source when stated).
3. Add any people with stackcrm_add_contact.
4. Log what happened with stackcrm_log_interaction (kind call/email/meeting/note + a concise body).
Then confirm what you recorded. Do not invent facts that aren't in the notes.

Notes:
${notes}`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  "stackcrm_prep",
  {
    title: "Prep a call",
    description: "Produce a sales call-prep brief for a company from the CRM.",
    argsSchema: {
      company: z.string().describe("Company name or id to prepare for"),
    },
  },
  ({ company }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Prepare a sales call-prep brief for "${company}" using StackCRM.
1. Find it with stackcrm_search_companies and read the full record with stackcrm_get_company.
2. Write the brief: (a) one-line snapshot, (b) notable tech-stack signals and what they imply, (c) gaps/unknowns worth confirming, (d) 2-3 suggested talking points.
Use only data in the CRM; flag anything missing rather than guessing.`,
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`stackcrm-mcp-server running (API: ${API_URL})`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
