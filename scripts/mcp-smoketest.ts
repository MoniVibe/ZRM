/**
 * Smoke test for the StackCRM MCP server. Spawns it over stdio exactly like a
 * real MCP client (Claude Desktop) would, then exercises read + write tools
 * end-to-end (MCP -> /api/crm -> service -> DB). Cleans up after itself.
 *
 * Requires the StackCRM app running on http://localhost:3000.
 *   npx tsx scripts/mcp-smoketest.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

function textOf(r: { content?: Array<{ type: string; text?: string }> }): string {
  return r.content?.map((c) => c.text ?? "").join("\n") ?? "";
}

async function main() {
const transport = new StdioClientTransport({
  command: process.execPath, // node.exe
  args: ["--import", "tsx", path.resolve("mcp/server.ts")],
  env: { ...process.env, STACKCRM_API_URL: "http://localhost:3000" },
});

const client = new Client({ name: "stackcrm-smoketest", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log(`TOOLS (${tools.tools.length}):`, tools.tools.map((t) => t.name).join(", "));

const call = (name: string, args: Record<string, unknown> = {}) =>
  client.callTool({ name, arguments: args }) as Promise<{
    content?: Array<{ type: string; text?: string }>;
  }>;

console.log("\n[1] search (all):");
console.log(textOf(await call("stackcrm_search_companies")));

console.log("\n[2] create company 'Initech':");
const created = await call("stackcrm_create_company", {
  name: "Initech",
  industry: "Software",
  size: "51-200",
  tags: ["smoketest"],
});
const createdText = textOf(created);
console.log(createdText);
const newId = JSON.parse(createdText).id as number;
console.log("-> new id:", newId);

console.log("\n[3] add tech 'Kubernetes' to Initech:");
console.log(textOf(await call("stackcrm_add_tech", {
  companyId: newId, name: "Kubernetes", category: "devops", confidence: "confirmed", source: "smoketest",
})));

console.log("\n[4] log interaction:");
console.log(textOf(await call("stackcrm_log_interaction", {
  companyId: newId, kind: "call", body: "Smoke-test call: they want a pilot.",
})));

console.log("\n[5] get full company back:");
const full = JSON.parse(textOf(await call("stackcrm_get_company", { id: newId })));
console.log(`name=${full.name} tech=${full.techStack.length} interactions=${full.interactions.length}`);

console.log("\n[6] search by tech 'Kubernetes':");
const k = JSON.parse(textOf(await call("stackcrm_search_companies", { tech: "Kubernetes" })));
console.log("matches:", k.map((c: { name: string }) => c.name).join(", "));

console.log("\n[7] cleanup: delete Initech:");
console.log(textOf(await call("stackcrm_delete_company", { id: newId })));

console.log("\n[8] confirm gone:");
console.log(textOf(await call("stackcrm_get_company", { id: newId })));

// Assertions
const techOk = full.techStack.length === 1 && full.interactions.length === 1;
const searchOk = k.some((c: { name: string }) => c.name === "Initech");
console.log("\nRESULT:", techOk && searchOk ? "PASS" : "FAIL", `(techOk=${techOk} searchOk=${searchOk})`);

await client.close();
process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
