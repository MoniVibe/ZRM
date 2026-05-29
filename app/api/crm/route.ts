import { z } from "zod";
import * as svc from "@/lib/crm/service";
import {
  SearchInputSchema,
  IdInputSchema,
  CompanyCreateSchema,
  CompanyUpdateSchema,
  TechItemCreateSchema,
  ContactCreateSchema,
  InteractionCreateSchema,
} from "@/lib/crm/schemas";

export const dynamic = "force-dynamic";

// Local RPC endpoint for the CRM. The MCP server (and any other local agent
// tooling) POSTs { op, args } here; the running Next app is the single owner of
// the database, which avoids PGlite multi-process contention.
//
// Optional shared-secret: if STACKCRM_API_TOKEN is set, callers must send it as
// the x-stackcrm-token header. Unset (the default) means open — fine for a
// local, single-user, loopback-only setup.

type Handler = (args: unknown) => Promise<unknown>;

const ops: Record<string, Handler> = {
  listCompanies: (a) => svc.listCompanies(SearchInputSchema.parse(a ?? {})),
  getCompany: (a) => svc.getCompany(IdInputSchema.parse(a).id),
  listKnownTech: () => svc.listKnownTech(),
  createCompany: (a) => svc.createCompany(CompanyCreateSchema.parse(a)),
  updateCompany: (a) => svc.updateCompany(CompanyUpdateSchema.parse(a)),
  deleteCompany: (a) => svc.deleteCompany(IdInputSchema.parse(a).id),
  addTechItem: (a) => svc.addTechItem(TechItemCreateSchema.parse(a)),
  removeTechItem: (a) => svc.removeTechItem(IdInputSchema.parse(a).id),
  addContact: (a) => svc.addContact(ContactCreateSchema.parse(a)),
  logInteraction: (a) => svc.logInteraction(InteractionCreateSchema.parse(a)),
};

export async function POST(request: Request) {
  const token = process.env.STACKCRM_API_TOKEN;
  if (token && request.headers.get("x-stackcrm-token") !== token) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { op?: string; args?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const op = body.op;
  if (!op || !(op in ops)) {
    return Response.json(
      {
        ok: false,
        error: `Unknown op '${op}'. Valid ops: ${Object.keys(ops).join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const data = await ops[op](body.args);
    return Response.json({ ok: true, data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json(
        { ok: false, error: "Invalid arguments", details: e.issues },
        { status: 400 },
      );
    }
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
