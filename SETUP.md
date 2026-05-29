# Setup

You need two things: a Postgres database and (for the AI brief) an Anthropic API key.

## 1. Install dependencies

```bash
npm install
```

## 2. Get a Postgres database

Easiest is a free serverless Postgres:

- **Neon** — https://neon.tech → create project → copy the connection string.
- **Supabase** — https://supabase.com → new project → Settings → Database → connection string (use the "Session" / direct connection).

Or run one locally with Docker:

```bash
docker run --name stackcrm-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
# then DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

## 3. Configure env

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `DATABASE_URL` — the string from step 2.
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com/settings/keys (only needed for the "Brief me" button).

## 4. Create the tables and seed demo data

```bash
npm run db:push    # creates tables from the schema
npm run db:seed    # inserts 2 demo companies so the UI isn't empty
```

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000.

---

## Database scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run db:push`    | Sync the schema straight to the DB (fast, dev-friendly).  |
| `npm run db:generate`| Generate a SQL migration file from schema changes.        |
| `npm run db:migrate` | Apply generated migrations (use this in production).      |
| `npm run db:seed`    | Wipe + reseed demo data.                                  |
| `npm run db:studio`  | Open Drizzle Studio to browse/edit data in the browser.   |

In development `db:push` is the quick path. When you're ready to take it
seriously, switch to `db:generate` + `db:migrate` so schema changes are
version-controlled.
