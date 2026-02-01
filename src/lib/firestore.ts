import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkItem } from '../types';

const WORK_ITEMS_COLLECTION = 'workItems';

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

export async function getWorkItems(): Promise<WorkItem[]> {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  const snapshot = await getDocs(collection(db, WORK_ITEMS_COLLECTION));
  return snapshot.docs.map((d) => deserializeWorkItem(d.data() as WorkItemData));
}

export async function addWorkItem(item: WorkItem): Promise<void> {
  if (!db) return;
  const ref = doc(db, WORK_ITEMS_COLLECTION, item.id);
  const data = serializeWorkItem(item);
  try {
    await setDoc(ref, data);
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
