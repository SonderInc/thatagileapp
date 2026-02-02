import type { WorkItem, TenantCompany, UserProfile, Role } from '../types';

/**
 * Data store interface — Firestore, Postgres, etc.
 * UI and business logic must use this; no direct Firestore/DB imports.
 */
export interface IDataStore {
  getWorkItems(companyId: string): Promise<WorkItem[]>;
  getTenantCompanies(): Promise<TenantCompany[]>;
  addTenantCompany(company: TenantCompany): Promise<void>;
  addWorkItem(item: WorkItem): Promise<void>;
  updateWorkItem(id: string, updates: Partial<WorkItem>): Promise<void>;
  deleteWorkItem(id: string): Promise<void>;
  getUserProfile(uid: string): Promise<UserProfile | null>;
  setUserProfile(profile: UserProfile): Promise<void>;
}

export type { WorkItem, TenantCompany, UserProfile, Role };
