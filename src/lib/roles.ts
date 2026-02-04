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
