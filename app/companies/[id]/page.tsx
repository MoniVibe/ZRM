import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/queries";
import {
  TECH_CATEGORIES,
  CONFIDENCE_LEVELS,
  INTERACTION_KINDS,
  categoryLabel,
} from "@/lib/constants";
import {
  addTechItem,
  deleteTechItem,
  addContact,
  addInteraction,
} from "../actions";
import { BriefButton } from "@/app/components/BriefButton";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm";

const confidenceColor: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  likely: "bg-yellow-100 text-yellow-700",
  rumored: "bg-neutral-100 text-neutral-500",
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(Number(id));
  if (!company) notFound();

  // Group stack items by category for display.
  const byCategory = new Map<string, typeof company.techStack>();
  for (const item of company.techStack) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Companies
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-sm text-neutral-500">
              {[
                company.industry,
                company.size && `${company.size} employees`,
                company.hqLocation,
              ]
                .filter(Boolean)
                .join(" · ") || "No details yet"}
            </p>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 hover:underline"
              >
                {company.website}
              </a>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {company.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        {company.description && (
          <p className="mt-3 text-sm text-neutral-700">{company.description}</p>
        )}
      </div>

      <Card title="AI call-prep brief">
        <BriefButton companyId={company.id} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tech stack — the headline data, gets the most room. */}
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Tech stack (${company.techStack.length})`}>
            {company.techStack.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Nothing recorded yet. Add what you learn below.
              </p>
            ) : (
              <div className="space-y-4">
                {TECH_CATEGORIES.filter((c) => byCategory.has(c.value)).map(
                  (cat) => (
                    <div key={cat.value}>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        {cat.label}
                      </h3>
                      <ul className="space-y-1.5">
                        {byCategory.get(cat.value)!.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <span className="font-medium">{t.name}</span>
                              {t.vendor && (
                                <span className="text-neutral-400">
                                  {" "}
                                  · {t.vendor}
                                </span>
                              )}
                              {t.source && (
                                <span className="block text-xs text-neutral-400">
                                  via {t.source}
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${confidenceColor[t.confidence]}`}
                              >
                                {t.confidence}
                              </span>
                              <form action={deleteTechItem}>
                                <input type="hidden" name="id" value={t.id} />
                                <input
                                  type="hidden"
                                  name="companyId"
                                  value={company.id}
                                />
                                <button
                                  type="submit"
                                  className="text-neutral-300 hover:text-red-500"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </form>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Add tech item */}
            <form
              action={addTechItem}
              className="mt-5 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <input
                name="name"
                required
                placeholder="Tech name (e.g. Datadog)"
                className={`${field} col-span-2`}
              />
              <select name="category" defaultValue="other" className={field}>
                {TECH_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select name="confidence" defaultValue="likely" className={field}>
                {CONFIDENCE_LEVELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                name="source"
                placeholder="Source (job post, call…)"
                className={field}
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Add tech
              </button>
            </form>
          </Card>

          <Card title="Interactions">
            {company.interactions.length === 0 ? (
              <p className="text-sm text-neutral-400">No interactions logged.</p>
            ) : (
              <ul className="space-y-3">
                {company.interactions.map((i) => (
                  <li key={i.id} className="text-sm">
                    <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs uppercase text-neutral-500">
                      {i.kind}
                    </span>
                    <span className="text-neutral-400">
                      {i.occurredAt.toISOString().slice(0, 10)}
                    </span>
                    <p className="mt-1 text-neutral-700">{i.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={addInteraction}
              className="mt-5 space-y-2 border-t border-neutral-100 pt-4"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <select name="kind" defaultValue="note" className={field}>
                {INTERACTION_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <textarea
                name="body"
                required
                rows={2}
                placeholder="What happened / what you learned…"
                className={field}
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Log it
              </button>
            </form>
          </Card>
        </div>

        {/* Contacts */}
        <div>
          <Card title="Contacts">
            {company.contacts.length === 0 ? (
              <p className="text-sm text-neutral-400">No contacts yet.</p>
            ) : (
              <ul className="space-y-3">
                {company.contacts.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="font-medium">{c.name}</div>
                    {c.title && (
                      <div className="text-neutral-500">{c.title}</div>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {c.email}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form
              action={addContact}
              className="mt-5 space-y-2 border-t border-neutral-100 pt-4"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <input
                name="name"
                required
                placeholder="Name"
                className={field}
              />
              <input name="title" placeholder="Title" className={field} />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className={field}
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Add contact
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
