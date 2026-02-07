/**
 * Ensures the user's Firestore profile has the given tenant in companyIds
 * (and adminCompanyIds when roles include 'admin') so planning board rules pass.
 */
import { getDataStore } from '../lib/adapters';
import { mergeProfileForBackfill } from '../lib/firestore';

export interface TenantMembershipError {
  code: string;
  message: string;
  details?: unknown;
}

export async function ensureUserTenantMembership(params: {
  uid: string;
  tenantId: string;
  roles: string[];
}): Promise<void> {
  const { uid, tenantId, roles } = params;
  if (!uid || !tenantId) {
    throw { code: 'AUTH_MISSING', message: 'uid and tenantId are required' } as TenantMembershipError;
  }

  const store = getDataStore();
  const profile = await store.getUserProfile(uid);
  if (!profile) {
    throw { code: 'AUTH_MISSING', message: 'User profile not found' } as TenantMembershipError;
  }

  const existingCompanyIds = profile.companyIds ?? profile.companies?.map((c) => c.companyId) ?? [];
  const hasTenantInCompanyIds = existingCompanyIds.includes(tenantId);
  const needsAdmin = roles.includes('admin');
  const hasAdminForTenant = (profile.adminCompanyIds ?? []).includes(tenantId);
  if (hasTenantInCompanyIds && (!needsAdmin || hasAdminForTenant)) {
    return;
  }

  const merged = mergeProfileForBackfill(profile, tenantId, roles);
  try {
    await store.setUserProfile(merged);
  } catch (err) {
    throw {
      code: 'PROFILE_WRITE_FAILED',
      message: err instanceof Error ? err.message : 'Failed to update user profile',
      details: err,
    } as TenantMembershipError;
  }

  const reread = await store.getUserProfile(uid);
  const rereadCompanyIds = reread?.companyIds ?? reread?.companies?.map((c) => c.companyId) ?? [];
  if (!rereadCompanyIds.includes(tenantId)) {
    throw {
      code: 'MEMBERSHIP_NOT_PRESENT',
      message: 'Profile was updated but tenant is not in companyIds after write',
    } as TenantMembershipError;
  }
}
