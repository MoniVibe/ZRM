# StackCRM

A company-centric CRM where the **tech stack is the headline**, not an
afterthought. Built for people who sell technical products *into* companies and
qualify on what those companies run.

Unlike a generic CRM, the primary record is a **company**, and its tech stack is
first-class, categorized data with confidence levels and sources — the kind of
signal that tells a salesperson whether and how to engage.

## What's here (vertical slice)

- **Companies** — list with free-text search + filter by a tech-stack item.
- **Company detail** — categorized tech stack (with confidence + source),
  contacts, and an interaction log. Inline forms to add each.
- **✨ Brief me** — an AI call-prep brief generated from *your own data* via the
  Claude API. No web scraping; it only summarizes what's in the record.

## Stack

- **Next.js 16** (App Router, React 19, server actions) + **TypeScript**
- **Tailwind CSS v4**
- **Postgres** + **Drizzle ORM**
- **Anthropic SDK** (`claude-opus-4-8`) for the AI brief

## Just want to run it? (no setup, no typing)

1. Double-click **`Create Desktop Shortcut.cmd`** once — it puts a **StackCRM**
   icon on your Desktop.
2. Double-click that **StackCRM** icon any time to start the app. It opens in
   your browser automatically.

The first launch installs what it needs (takes a few minutes, only once). If
Node.js isn't installed, the launcher opens the download page and tells you what
to click.

**To stop the app:** just close the black window — that fully shuts it down.
Or double-click **`Stop StackCRM.cmd`** if you ever left it running.

> Data is stored locally on your machine — no accounts or internet required.

### Getting a new version

When there's an update, double-click **`Update StackCRM.cmd`**. It pulls the
latest from GitHub and applies it. Your saved data and settings are never
touched. (Requires the app to have been installed via `git clone` — see below.)

## Getting started (developers)

See **[SETUP.md](./SETUP.md)**. With **no `DATABASE_URL`**, the app runs against
a local **PGlite** database (zero setup) — just `npm install` then `npm run dev`.
Set a `DATABASE_URL` to use real Postgres instead; no code changes needed.

## Design notes

- **Multi-tenant ready, single-user today.** Every row carries an `org_id`
  (hardcoded to `1` via `lib/org.ts`). When auth lands, swap that one function
  for a session lookup — no migration, no query rewrites.
- **All data access goes through `lib/queries.ts`**, so org-scoping lives in one
  place. Pages and server actions never touch the DB client directly.
- **The honest competitor is a spreadsheet.** Scope stays on the three things a
  spreadsheet can't do: fast structured entry, filtering by stack, and the AI
  brief.

## Roadmap / parked

1. Auth + multi-user (the `org_id` groundwork is already in).
2. Opportunities / pipeline stages.
3. **Web enrichment** — auto-detect stack from domains, job posts, etc. The hard
   part; deliberately deferred until the core workflow is validated.
4. Cross-company AI queries ("which accounts run Datadog and are mid-migration").
