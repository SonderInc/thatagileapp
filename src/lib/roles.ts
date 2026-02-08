import type { UserProfile } from '../types';

/**
 * Canonical check: is this user an admin for the given company?
 * Uses the same sources as Firestore rules: adminCompanyIds and companies[].roles.
 * Use this for permission gating (e.g. InviteUserPage, Navigation) so the app
 * and rules stay in sync.
 */
export function isAdminForCompany(
  profile: UserProfile | null | undefined,
  companyId: string | null | undefined
): boolean {
  if (!profile || !companyId) return false;
  if (profile.adminCompanyIds?.includes(companyId)) return true;
  const entry = profile.companies?.find((c) => c.companyId === companyId);
  return entry?.roles?.includes('admin') ?? false;
}

/**
 * Canonical check: is this user an app-level administrator (can see all instances)?
 * Use for gating the App Admin page and nav entry.
 */
export function isAppAdmin(profile: UserProfile | null | undefined): boolean {
  return profile?.appAdmin === true;
}

/**
 * Can this user edit other users in the directory (name, phone, roles) for the given company?
 * True for Admin, RTE, or HR for that company. Use for InviteUserPage directory Actions column.
 */
export function canEditUserInDirectory(
  profile: UserProfile | null | undefined,
  companyId: string | null | undefined
): boolean {
  if (!profile || !companyId) return false;
  if (isAdminForCompany(profile, companyId)) return true;
  if (profile.rteCompanyIds?.includes(companyId)) return true;
  return profile.companies?.some((c) => c.companyId === companyId && c.roles?.includes('hr')) ?? false;
}
