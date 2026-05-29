// Display metadata for the enum values in the schema. Keeping labels and
// ordering here means the UI and the AI prompt draw from one source of truth.

export const TECH_CATEGORIES = [
  { value: "cloud", label: "Cloud / Infra" },
  { value: "language", label: "Language" },
  { value: "framework", label: "Framework" },
  { value: "database", label: "Database" },
  { value: "datastore", label: "Cache / Queue / Store" },
  { value: "devops", label: "DevOps / CI-CD" },
  { value: "observability", label: "Observability" },
  { value: "security", label: "Security" },
  { value: "analytics", label: "Analytics / Data" },
  { value: "collaboration", label: "Collaboration" },
  { value: "crm", label: "CRM / GTM" },
  { value: "other", label: "Other" },
] as const;

export const CONFIDENCE_LEVELS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "likely", label: "Likely" },
  { value: "rumored", label: "Rumored" },
] as const;

export const SIZE_BUCKETS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const INTERACTION_KINDS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
] as const;

export function categoryLabel(value: string): string {
  return TECH_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
