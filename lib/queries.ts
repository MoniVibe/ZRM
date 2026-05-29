// Reads now live in the shared service layer. Re-exported here so existing
// page imports (`@/lib/queries`) keep working.
export { listCompanies, getCompany, listKnownTech } from "@/lib/crm/service";
export type { CompanyListItem } from "@/lib/crm/service";
