import Anthropic from "@anthropic-ai/sdk";
import { getCompany } from "@/lib/queries";
import { categoryLabel } from "@/lib/constants";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 400 },
    );
  }

  let companyId: number;
  try {
    const body = await request.json();
    companyId = Number(body.companyId);
    if (!companyId) throw new Error();
  } catch {
    return Response.json({ error: "Invalid companyId" }, { status: 400 });
  }

  const company = await getCompany(companyId);
  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  // Flatten everything we know into a compact, labelled context block. The
  // model only sees the user's own data — no external lookups.
  const stack =
    company.techStack
      .map(
        (t) =>
          `- [${categoryLabel(t.category)}] ${t.name}${t.vendor ? ` (${t.vendor})` : ""} — confidence: ${t.confidence}${t.source ? `, source: ${t.source}` : ""}${t.notes ? `. ${t.notes}` : ""}`,
      )
      .join("\n") || "(none recorded)";

  const contacts =
    company.contacts
      .map(
        (c) =>
          `- ${c.name}${c.title ? `, ${c.title}` : ""}${c.email ? ` <${c.email}>` : ""}`,
      )
      .join("\n") || "(none recorded)";

  const history =
    company.interactions
      .slice(0, 15)
      .map(
        (i) =>
          `- [${i.kind}] ${i.occurredAt.toISOString().slice(0, 10)}: ${i.body}`,
      )
      .join("\n") || "(no logged interactions)";

  const context = `Company: ${company.name}
Industry: ${company.industry ?? "unknown"}
Headcount: ${company.size ?? "unknown"}
Domain: ${company.domain ?? "unknown"}
HQ: ${company.hqLocation ?? "unknown"}
Tags: ${company.tags.join(", ") || "none"}
Notes: ${company.description ?? "none"}

KNOWN TECH STACK:
${stack}

CONTACTS:
${contacts}

RECENT INTERACTIONS:
${history}`;

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "You are a sales-prep assistant for a salesperson who sells technical products into companies. " +
        "Given a CRM record, write a concise call-prep brief. Use only the data provided — never invent facts. " +
        "Structure it as: (1) one-line snapshot, (2) notable tech-stack signals and what they imply, " +
        "(3) gaps or unknowns worth confirming, (4) 2-3 suggested talking points. Be specific and brief.",
      messages: [
        {
          role: "user",
          content: `Here is the CRM record. Write the prep brief.\n\n${context}`,
        },
      ],
    });

    const brief = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");

    return Response.json({ brief });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 500 },
    );
  }
}
