import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkItem, TenantCompany, UserProfile, Role, Team } from '../types';

const WORK_ITEMS_COLLECTION = 'workItems';
const COMPANIES_COLLECTION = 'companies';
const USERS_COLLECTION = 'users';
const INVITES_COLLECTION = 'invites';
const LICENCES_COLLECTION = 'licences';
const TEAMS_COLLECTION = 'teams';

type WorkItemData = Record<string, unknown>;

/** Build a Firestore-safe object (primitives, arrays, Timestamp only). */
function serializeWorkItem(item: WorkItem | Partial<WorkItem>): WorkItemData {
  const out: Record<string, unknown> = {};
  if (item.id !== undefined) out.id = item.id;
  if (item.type !== undefined) out.type = item.type;
  if (item.title !== undefined) out.title = item.title;
  if (item.status !== undefined) out.status = item.status;
  if (item.createdAt !== undefined) {
    out.createdAt = item.createdAt instanceof Date ? Timestamp.fromDate(item.createdAt) : item.createdAt;
  }
  if (item.updatedAt !== undefined) {
    out.updatedAt = item.updatedAt instanceof Date ? Timestamp.fromDate(item.updatedAt) : item.updatedAt;
  }
  if (item.description !== undefined) out.description = item.description;
  if (item.priority !== undefined) out.priority = item.priority;
  if (item.assignee !== undefined) out.assignee = item.assignee;
  if (item.tags !== undefined) out.tags = item.tags;
  if (item.companyId !== undefined) out.companyId = item.companyId;
  if (item.parentId !== undefined) out.parentId = item.parentId;
  if (item.childrenIds !== undefined) out.childrenIds = item.childrenIds;
  if (item.sprintId !== undefined) out.sprintId = item.sprintId;
  if (item.size !== undefined) out.size = item.size;
  if (item.storyPoints !== undefined) out.storyPoints = item.storyPoints;
  if (item.estimatedDays !== undefined) out.estimatedDays = item.estimatedDays;
  if (item.estimatedHours !== undefined) out.estimatedHours = item.estimatedHours;
  if (item.actualHours !== undefined) out.actualHours = item.actualHours;
  if (item.color !== undefined) out.color = item.color;
  if (item.acceptanceCriteria !== undefined) out.acceptanceCriteria = item.acceptanceCriteria;
  if (item.metadata !== undefined) out.metadata = item.metadata;
  if ((item as WorkItem).lane !== undefined) out.lane = (item as WorkItem).lane;
  return out as WorkItemData;
}

function deserializeWorkItem(data: WorkItemData): WorkItem {
  const createdAt = data.createdAt;
  const updatedAt = data.updatedAt;
  return {
    ...data,
    createdAt:
      createdAt && typeof (createdAt as Timestamp).toDate === 'function'
        ? (createdAt as Timestamp).toDate()
        : createdAt instanceof Date
          ? createdAt
          : new Date(createdAt as string),
    updatedAt:
      updatedAt && typeof (updatedAt as Timestamp).toDate === 'function'
        ? (updatedAt as Timestamp).toDate()
        : updatedAt instanceof Date
          ? updatedAt
          : new Date(updatedAt as string),
  } as WorkItem;
}

/** Get work items for a tenant (companyId = tenant id from companies collection). */
export async function getWorkItems(companyId: string): Promise<WorkItem[]> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const q = query(
    collection(db, WORK_ITEMS_COLLECTION),
    where('companyId', '==', companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => deserializeWorkItem(d.data() as WorkItemData));
}

/** Get all tenant companies (for dev or admin). */
export async function getTenantCompanies(): Promise<TenantCompany[]> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const snapshot = await getDocs(collection(db, COMPANIES_COLLECTION));
  return snapshot.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt;
    const updatedAt = data.updatedAt;
    const trialEndsAt = data.trialEndsAt;
    return {
      id: d.id,
      name: data.name ?? '',
      slug: data.slug ?? '',
      createdAt:
        createdAt && typeof (createdAt as Timestamp).toDate === 'function'
          ? (createdAt as Timestamp).toDate()
          : createdAt instanceof Date
            ? createdAt
            : new Date(createdAt as string),
      updatedAt:
        updatedAt && typeof (updatedAt as Timestamp).toDate === 'function'
          ? (updatedAt as Timestamp).toDate()
          : updatedAt instanceof Date
            ? updatedAt
            : new Date(updatedAt as string),
      trialEndsAt:
        trialEndsAt && typeof (trialEndsAt as Timestamp).toDate === 'function'
          ? (trialEndsAt as Timestamp).toDate()
          : trialEndsAt instanceof Date
            ? trialEndsAt
            : undefined,
      seats: typeof data.seats === 'number' ? data.seats : 50,
      licenseKey: typeof data.licenseKey === 'string' ? data.licenseKey : undefined,
      vision: typeof data.vision === 'string' ? data.vision : undefined,
      logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : undefined,
      companyType: data.companyType === 'training' ? 'training' : 'software',
    } as TenantCompany;
  });
}

/** Create a tenant company. */
export async function addTenantCompany(company: TenantCompany): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, COMPANIES_COLLECTION, company.id);
  const payload: Record<string, unknown> = {
    name: company.name,
    slug: company.slug,
    createdAt: company.createdAt instanceof Date ? Timestamp.fromDate(company.createdAt) : company.createdAt,
    updatedAt: company.updatedAt instanceof Date ? Timestamp.fromDate(company.updatedAt) : company.updatedAt,
    seats: company.seats ?? 50,
  };
  if (company.trialEndsAt !== undefined) {
    payload.trialEndsAt = company.trialEndsAt instanceof Date ? Timestamp.fromDate(company.trialEndsAt) : company.trialEndsAt;
  }
  if (company.licenseKey !== undefined) payload.licenseKey = company.licenseKey;
  if (company.vision !== undefined) payload.vision = company.vision;
  if (company.logoUrl !== undefined) payload.logoUrl = company.logoUrl;
  if (company.companyType !== undefined) payload.companyType = company.companyType;
  await setDoc(ref, payload);
}

/** Update a tenant company (partial). */
export async function updateCompany(companyId: string, updates: Partial<Pick<TenantCompany, 'name' | 'vision' | 'logoUrl' | 'seats' | 'licenseKey' | 'updatedAt' | 'companyType'>>): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, COMPANIES_COLLECTION, companyId);
  const payload: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.vision !== undefined && { vision: updates.vision }),
    ...(updates.logoUrl !== undefined && { logoUrl: updates.logoUrl }),
    ...(updates.seats !== undefined && { seats: updates.seats }),
    ...(updates.licenseKey !== undefined && { licenseKey: updates.licenseKey }),
    ...(updates.companyType !== undefined && { companyType: updates.companyType }),
  };
  await updateDoc(ref, payload);
}

const SAVE_TIMEOUT_MS = 15000;

export async function addWorkItem(item: WorkItem): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  if (!item.companyId) return Promise.reject(new Error('Work item must have companyId (tenant)'));
  const ref = doc(db, WORK_ITEMS_COLLECTION, item.id);
  const data = serializeWorkItem(item);
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Save timed out. Check network and Firestore rules.')),
        SAVE_TIMEOUT_MS
      );
    });
    await Promise.race([setDoc(ref, data), timeoutPromise]);
    if (import.meta.env.DEV) console.log('[Firebase] Saved work item:', item.id, item.type, item.title);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error('[Firebase] addWorkItem failed:', e?.code, e?.message || err);
    throw err;
  }
}

export async function updateWorkItem(
  id: string,
  updates: Partial<WorkItem>
): Promise<void> {
  if (!db) return;
  const ref = doc(db, WORK_ITEMS_COLLECTION, id);
  const data = serializeWorkItem(updates);
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) filtered[k] = v;
  }
  if (Object.keys(filtered).length === 0) return;
  await updateDoc(ref, filtered);
}

export async function deleteWorkItem(id: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, WORK_ITEMS_COLLECTION, id);
  await deleteDoc(ref);
}

const FIRESTORE_BATCH_LIMIT = 500;

/** Delete multiple work items in batches (children-first order recommended). */
export async function batchDeleteWorkItems(ids: string[]): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = ids.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, WORK_ITEMS_COLLECTION, id));
    }
    await batch.commit();
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const companies = data.companies as { companyId: string; roles: string[] }[] | undefined;
  return {
    uid: snap.id,
    email: data.email ?? '',
    displayName: data.displayName ?? '',
    companyId: data.companyId ?? null,
    companies: companies?.map((c) => ({ companyId: c.companyId, roles: c.roles as Role[] })),
    mustChangePassword: data.mustChangePassword === true,
    employeeNumber: typeof data.employeeNumber === 'string' ? data.employeeNumber : undefined,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
  };
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, USERS_COLLECTION, profile.uid);
  const companyIds = profile.companies?.map((c) => c.companyId) ?? (profile.companyId ? [profile.companyId] : []);
  const adminCompanyIds =
    profile.companies?.filter((c) => c.roles?.includes('admin')).map((c) => c.companyId) ?? [];
  await setDoc(ref, {
    email: profile.email,
    displayName: profile.displayName,
    companyId: profile.companyId,
    companyIds,
    adminCompanyIds,
    ...(profile.companies && { companies: profile.companies }),
    ...(profile.mustChangePassword !== undefined && { mustChangePassword: profile.mustChangePassword }),
    ...(profile.employeeNumber !== undefined && { employeeNumber: profile.employeeNumber }),
    ...(profile.phone !== undefined && { phone: profile.phone }),
  });
}

export async function clearMustChangePassword(uid: string): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, { mustChangePassword: false });
}

/** Count users that belong to a company (for seat enforcement). */
export async function getCompanyUserCount(companyId: string): Promise<number> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const q = query(
    collection(db, USERS_COLLECTION),
    where('companyIds', 'array-contains', companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/** List user profiles that belong to a company (for user directory). */
export async function getCompanyUsers(companyId: string): Promise<UserProfile[]> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const q = query(
    collection(db, USERS_COLLECTION),
    where('companyIds', 'array-contains', companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    const companies = data.companies as { companyId: string; roles: string[] }[] | undefined;
    return {
      uid: d.id,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      companyId: data.companyId ?? null,
      companies: companies?.map((c) => ({ companyId: c.companyId, roles: c.roles as Role[] })),
      mustChangePassword: data.mustChangePassword === true,
      employeeNumber: typeof data.employeeNumber === 'string' ? data.employeeNumber : undefined,
      phone: typeof data.phone === 'string' ? data.phone : undefined,
    } as UserProfile;
  });
}

/** Invite payload for addInvite. */
export interface InviteInput {
  email: string;
  companyId: string;
  roles: Role[];
  invitedBy: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  phone?: string;
}

/** Invite record returned by getInviteByToken. */
export interface InviteRecord {
  email: string;
  companyId: string;
  roles: Role[];
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  phone?: string;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

export async function addInvite(invite: InviteInput): Promise<{ token: string }> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const token = generateToken();
  const ref = doc(db, INVITES_COLLECTION, token);
  await setDoc(ref, {
    email: invite.email,
    companyId: invite.companyId,
    roles: invite.roles,
    invitedBy: invite.invitedBy,
    createdAt: Timestamp.now(),
    ...(invite.firstName !== undefined && { firstName: invite.firstName }),
    ...(invite.lastName !== undefined && { lastName: invite.lastName }),
    ...(invite.employeeNumber !== undefined && { employeeNumber: invite.employeeNumber }),
    ...(invite.phone !== undefined && { phone: invite.phone }),
  });
  return { token };
}

export async function getInviteByToken(token: string): Promise<InviteRecord | null> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, INVITES_COLLECTION, token);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: data.email ?? '',
    companyId: data.companyId ?? '',
    roles: (data.roles as Role[]) ?? [],
    firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
    employeeNumber: typeof data.employeeNumber === 'string' ? data.employeeNumber : undefined,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
  };
}

export async function markInviteUsed(token: string): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, INVITES_COLLECTION, token);
  await deleteDoc(ref);
}

/** Licence doc: key (doc id), seats, usedByCompanyId?, usedAt? */
export async function getLicenceByKey(key: string): Promise<{ seats: number } | null> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, LICENCES_COLLECTION, key);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.usedByCompanyId) return null;
  const seats = typeof data.seats === 'number' ? data.seats : 0;
  return seats > 0 ? { seats } : null;
}

export async function redeemLicence(companyId: string, key: string): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const lic = await getLicenceByKey(key);
  if (!lic) throw new Error('Invalid or already used licence key');
  const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
  await updateDoc(companyRef, {
    seats: lic.seats,
    licenseKey: key,
    updatedAt: Timestamp.now(),
  });
  const licRef = doc(db, LICENCES_COLLECTION, key);
  await updateDoc(licRef, {
    usedByCompanyId: companyId,
    usedAt: Timestamp.now(),
  });
}

/** Teams (company-scoped). */
function parseTeamDoc(id: string, data: Record<string, unknown>): Team {
  const createdAt = data.createdAt;
  const updatedAt = data.updatedAt;
  return {
    id,
    name: (typeof data.name === 'string' ? data.name : '') || '',
    companyId: (typeof data.companyId === 'string' ? data.companyId : '') || '',
    memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
    createdAt:
      createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === 'function'
        ? (createdAt as { toDate: () => Date }).toDate()
        : createdAt instanceof Date
          ? createdAt
          : new Date(String(createdAt)),
    updatedAt:
      updatedAt && typeof (updatedAt as { toDate?: () => Date }).toDate === 'function'
        ? (updatedAt as { toDate: () => Date }).toDate()
        : updatedAt instanceof Date
          ? updatedAt
          : new Date(String(updatedAt)),
    ...(data.createdBy != null ? { createdBy: data.createdBy as string } : {}),
  };
}

export async function getTeams(companyId: string): Promise<Team[]> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where('companyId', '==', companyId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => parseTeamDoc(d.id, d.data()));
}

export async function addTeam(team: Team): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, TEAMS_COLLECTION, team.id);
  await setDoc(ref, {
    name: team.name,
    companyId: team.companyId,
    memberIds: team.memberIds ?? [],
    createdAt: team.createdAt instanceof Date ? Timestamp.fromDate(team.createdAt) : team.createdAt,
    updatedAt: team.updatedAt instanceof Date ? Timestamp.fromDate(team.updatedAt) : team.updatedAt,
    ...(team.createdBy && { createdBy: team.createdBy }),
  });
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, TEAMS_COLLECTION, id);
  const data: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.memberIds !== undefined) data.memberIds = updates.memberIds;
  await updateDoc(ref, data);
}

export async function deleteTeam(id: string): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, TEAMS_COLLECTION, id);
  await deleteDoc(ref);
}
