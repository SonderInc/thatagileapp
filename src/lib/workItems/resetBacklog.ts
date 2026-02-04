import { getDataStore } from '../adapters';
import type { WorkItem } from '../../types';
import { collectSubtreeIdsInDeleteOrder, getSubtreeStats, type SubtreeStats } from './subtree';

export interface ResetBacklogPreview {
  companyWorkItemId: string;
  idsToDelete: string[];
  stats: SubtreeStats;
  totalCount: number;
}

const COMPANY_WORK_ITEM_ID_PREFIX = 'company-wi-';

/**
 * Get the Company WorkItem for the tenant (type === 'company', companyId === tenantId).
 * If multiple exist (e.g. one from Ensure, one from Add Company), prefer the one that has product children so Reset Backlog targets the real backlog root.
 */
function findCompanyWorkItem(items: WorkItem[], tenantId: string): WorkItem | null {
  const candidates = items.filter((i) => i.type === 'company' && i.companyId === tenantId);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const byId = new Map(items.map((i) => [i.id, i]));
  const withProducts = candidates.filter((c) =>
    (c.childrenIds ?? []).some((id) => byId.get(id)?.type === 'product')
  );
  return withProducts[0] ?? candidates[0];
}

/**
 * Ensure a Company WorkItem exists for the tenant (root of backlog). Creates one if missing.
 * Use when creating a new tenant or when Reset Backlog finds no company work item.
 * Returns the company work item (existing or newly created), or null if tenant not found.
 */
export async function ensureCompanyWorkItem(tenantId: string): Promise<WorkItem | null> {
  const store = getDataStore();
  const companies = await store.getTenantCompanies();
  const tenant = companies.find((c) => c.id === tenantId);
  if (!tenant) return null;
  const items = await store.getWorkItems(tenantId);
  const existing = findCompanyWorkItem(items, tenantId);
  if (existing) return existing;
  const now = new Date();
  const companyWorkItem: WorkItem = {
    id: `${COMPANY_WORK_ITEM_ID_PREFIX}${tenantId}`,
    type: 'company',
    title: tenant.name,
    status: 'backlog',
    createdAt: now,
    updatedAt: now,
    companyId: tenantId,
    childrenIds: [],
  };
  await store.addWorkItem(companyWorkItem);
  return companyWorkItem;
}

/**
 * Collect all product-child subtree ids in delete order and stats.
 * Used for preview and for the actual reset. Creates Company WorkItem if missing.
 */
async function collectIdsAndStats(tenantId: string): Promise<{
  company: WorkItem;
  idsToDelete: string[];
  stats: SubtreeStats;
} | null> {
  const store = getDataStore();
  let items = await store.getWorkItems(tenantId);
  let company = findCompanyWorkItem(items, tenantId);
  if (!company) {
    const created = await ensureCompanyWorkItem(tenantId);
    if (!created) return null;
    items = await store.getWorkItems(tenantId);
    company = findCompanyWorkItem(items, tenantId) ?? created;
  }

  const productChildIds = (company.childrenIds ?? []).filter((id) => {
    const item = items.find((i) => i.id === id);
    return item?.type === 'product';
  });

  const byId = new Map(items.map((i) => [i.id, i]));
  const allIds: string[] = [];
  for (const productId of productChildIds) {
    if (!byId.has(productId)) continue;
    const subtree = collectSubtreeIdsInDeleteOrder(items, productId);
    allIds.push(...subtree);
  }

  const stats = getSubtreeStats(items, allIds);
  return { company, idsToDelete: allIds, stats };
}

/**
 * Preview what would be deleted: counts by type and total. Returns null if no Company WorkItem for tenant.
 */
export async function getResetBacklogPreview(tenantId: string): Promise<ResetBacklogPreview | null> {
  const result = await collectIdsAndStats(tenantId);
  if (!result) return null;
  return {
    companyWorkItemId: result.company.id,
    idsToDelete: result.idsToDelete,
    stats: result.stats,
    totalCount: result.idsToDelete.length,
  };
}

/**
 * Reset the tenant backlog: delete all Products under the Company WorkItem and clear company.childrenIds.
 * Idempotent if there are no products (no-op). Throws if no Company WorkItem for tenant.
 */
export async function resetBacklog(tenantId: string): Promise<void> {
  const result = await collectIdsAndStats(tenantId);
  if (!result) throw new Error('No Company work item found for this tenant.');
  const { company, idsToDelete } = result;
  const store = getDataStore();
  if (idsToDelete.length > 0) {
    await store.batchDeleteWorkItems(idsToDelete);
  }
  await store.updateWorkItem(company.id, {
    childrenIds: [],
    updatedAt: new Date(),
  });
}
