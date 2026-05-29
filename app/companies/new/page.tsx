import Link from "next/link";
import { createCompany } from "../actions";
import { SIZE_BUCKETS } from "@/lib/constants";

const field =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
const label = "block text-sm font-medium text-neutral-700";

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add company</h1>
      </div>

      <form action={createCompany} className="space-y-4">
        <div>
          <label className={label} htmlFor="name">
            Company name *
          </label>
          <input id="name" name="name" required className={field} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="domain">
              Domain
            </label>
            <input
              id="domain"
              name="domain"
              placeholder="acme.com"
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="website">
              Website
            </label>
            <input
              id="website"
              name="website"
              placeholder="https://acme.com"
              className={field}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="industry">
              Industry
            </label>
            <input id="industry" name="industry" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="size">
              Headcount
            </label>
            <select id="size" name="size" defaultValue="" className={field}>
              <option value="">Unknown</option>
              {SIZE_BUCKETS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="hqLocation">
            HQ location
          </label>
          <input id="hqLocation" name="hqLocation" className={field} />
        </div>

        <div>
          <label className={label} htmlFor="tags">
            Tags <span className="text-neutral-400">(comma separated)</span>
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="prospect, enterprise, west-coast"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="description">
            Notes
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className={field}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create company
          </button>
          <Link
            href="/"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
