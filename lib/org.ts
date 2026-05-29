// The "current org" — i.e. who owns the data we're looking at.
//
// Today this is hardcoded to the single local user. When auth lands, replace
// the body of currentOrgId() with a lookup from the session. Every query in
// lib/queries.ts already filters by this value, so nothing else has to change.
export const CURRENT_ORG_ID = 1;

export function currentOrgId(): number {
  return CURRENT_ORG_ID;
}
