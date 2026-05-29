import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { listCompanies, listKnownTech } from "@/lib/queries";

export const dynamic = "force-dynamic";

function SetupNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-amber-900">
        Almost there — connect a database
      </h2>
      <p className="mt-2 text-sm text-amber-800">
        StackCRM needs a Postgres connection. Copy{" "}
        <code className="rounded bg-amber-100 px-1">.env.example</code> to{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code>, paste a
        connection string (a free database from{" "}
        <a className="underline" href="https://neon.tech">
          Neon
        </a>{" "}
        or{" "}
        <a className="underline" href="https://supabase.com">
          Supabase
        </a>{" "}
        works), then run:
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
        npm run db:push{"\n"}npm run db:seed
      </pre>
      <p className="mt-2 text-sm text-amber-800">
        See <code className="rounded bg-amber-100 px-1">SETUP.md</code> for the
        full walkthrough.
      </p>
    </div>
  );
}

function DbErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-900">
        Couldn&apos;t reach the database
      </h2>
      <p className="mt-2 text-sm text-red-800">
        The connection string is set, but the query failed. If this is a fresh
        database, you probably need to create the tables:
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
        npm run db:push{"\n"}npm run db:seed
      </pre>
      <p className="mt-2 font-mono text-xs text-red-700">{message}</p>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tech?: string }>;
}) {
  const { q, tech } = await searchParams;

  if (!isDbConfigured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <SetupNotice />
      </div>
    );
  }

  let companies: Awaited<ReturnType<typeof listCompanies>> = [];
  let knownTech: string[] = [];
  let error: string | null = null;
  try {
    [companies, knownTech] = await Promise.all([
      listCompanies({ search: q, tech }),
      listKnownTech(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <DbErrorNotice message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <span className="text-sm text-neutral-500">
          {companies.length} {companies.length === 1 ? "company" : "companies"}
        </span>
      </div>

      <form className="flex flex-wrap gap-3" action="/">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, industry, domain…"
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select
          name="tech"
          defaultValue={tech ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Any tech</option>
          {knownTech.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Filter
        </button>
      </form>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          No companies match.{" "}
          <Link href="/companies/new" className="font-medium underline">
            Add one
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {companies.map((c) => (
            <li key={c.id}>
              <Link
                href={`/companies/${c.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="truncate text-sm text-neutral-500">
                    {[c.industry, c.domain, c.size && `${c.size} employees`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {c.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                    {c.stackCount} tech
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
