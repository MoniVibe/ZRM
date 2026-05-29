# StackCRM MCP server

Lets an AI agent (Claude Desktop, Claude Code, etc.) read and edit the CRM in
plain language — "add Acme, they use Datadog and AWS, I called their VP today,
remind me to follow up." The agent does the structured data entry; the human
never touches a form.

## How it fits together

```
Claude Desktop ──stdio──> stackcrm-mcp-server ──HTTP──> StackCRM app ──> database
   (the agent)              (this folder)         POST /api/crm      (PGlite, one owner)
```

The MCP server is a thin bridge — it never opens the database directly. The
running StackCRM app stays the single owner of the local database, so the agent
and the web view never fight over it.

**The StackCRM app must be running** for the agent's tools to work. Start it with
the **Launch StackCRM** shortcut first. If it isn't running, the tools return a
clear "is the app running?" error.

## Tools exposed

| Tool | What it does |
| --- | --- |
| `stackcrm_search_companies` | Find companies by text and/or tech filter |
| `stackcrm_get_company` | Full record: profile, tech stack, contacts, history |
| `stackcrm_list_tech` | Distinct tech names across all companies |
| `stackcrm_create_company` | Add a company |
| `stackcrm_update_company` | Edit company fields |
| `stackcrm_delete_company` | Delete a company (and its tech/contacts/history) |
| `stackcrm_add_tech` | Record a tech-stack item with confidence + source |
| `stackcrm_remove_tech` | Remove a tech-stack item |
| `stackcrm_add_contact` | Add a person at a company |
| `stackcrm_log_interaction` | Log a call/email/meeting/note |

## Connect it to Claude Desktop

1. Open Claude Desktop's config file (Settings → Developer → Edit Config), at
   `%APPDATA%\Claude\claude_desktop_config.json`.
2. Add a `stackcrm` server (adjust the path to where you cloned the repo):

   ```json
   {
     "mcpServers": {
       "stackcrm": {
         "command": "node",
         "args": ["--import", "tsx", "C:\\path\\to\\ZRM\\mcp\\server.ts"],
         "cwd": "C:\\path\\to\\ZRM"
       }
     }
   }
   ```

   If your Claude Desktop version doesn't support `cwd`, point it at the wrapper
   instead:

   ```json
   {
     "mcpServers": {
       "stackcrm": {
         "command": "cmd",
         "args": ["/c", "C:\\path\\to\\ZRM\\mcp\\stackcrm-mcp.cmd"]
       }
     }
   }
   ```
3. Restart Claude Desktop. Launch StackCRM. Now you can ask Claude to manage the CRM.

## Configuration

- `STACKCRM_API_URL` — base URL of the app (default `http://localhost:3000`).
- `STACKCRM_API_TOKEN` — optional shared secret; set the same value on the app
  (`.env.local`) and here (via the `env` block in the config) to require it.

## Test it

With the app running:

```bash
npx tsx scripts/mcp-smoketest.ts
```

Spawns the server like a real client and exercises every tool end-to-end.
