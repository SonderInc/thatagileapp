import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkItem, TenantCompany, UserProfile, Role } from '../types';

const WORK_ITEMS_COLLECTION = 'workItems';
const COMPANIES_COLLECTION = 'companies';
const USERS_COLLECTION = 'users';

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
    } as TenantCompany;
  });
}

/** Create a tenant company. */
export async function addTenantCompany(company: TenantCompany): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, COMPANIES_COLLECTION, company.id);
  await setDoc(ref, {
    name: company.name,
    slug: company.slug,
    createdAt: company.createdAt instanceof Date ? Timestamp.fromDate(company.createdAt) : company.createdAt,
    updatedAt: company.updatedAt instanceof Date ? Timestamp.fromDate(company.updatedAt) : company.updatedAt,
  });
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
  };
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const ref = doc(db, USERS_COLLECTION, profile.uid);
  await setDoc(ref, {
    email: profile.email,
    displayName: profile.displayName,
    companyId: profile.companyId,
    ...(profile.companies && { companies: profile.companies }),
  });
}
