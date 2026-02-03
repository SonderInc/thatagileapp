import type { WorkItem, TenantCompany, UserProfile, Role } from '../types';

/**
 * Data store interface — Firestore, Postgres, etc.
 * UI and business logic must use this; no direct Firestore/DB imports.
 */
export interface IDataStore {
  getWorkItems(companyId: string): Promise<WorkItem[]>;
  getTenantCompanies(): Promise<TenantCompany[]>;
  addTenantCompany(company: TenantCompany): Promise<void>;
  updateCompany(companyId: string, updates: Partial<Pick<TenantCompany, 'name' | 'vision' | 'logoUrl' | 'seats' | 'licenseKey' | 'updatedAt'>>): Promise<void>;
  addWorkItem(item: WorkItem): Promise<void>;
  updateWorkItem(id: string, updates: Partial<WorkItem>): Promise<void>;
  deleteWorkItem(id: string): Promise<void>;
  getUserProfile(uid: string): Promise<UserProfile | null>;
  setUserProfile(profile: UserProfile): Promise<void>;
  clearMustChangePassword(uid: string): Promise<void>;
  getCompanyUserCount(companyId: string): Promise<number>;
  addInvite(invite: { email: string; companyId: string; roles: Role[]; invitedBy: string }): Promise<{ token: string }>;
  getInviteByToken(token: string): Promise<{ email: string; companyId: string; roles: Role[] } | null>;
  markInviteUsed(token: string): Promise<void>;
  getLicenceByKey(key: string): Promise<{ seats: number } | null>;
  redeemLicence(companyId: string, key: string): Promise<void>;
}

export type { WorkItem, TenantCompany, UserProfile, Role };
