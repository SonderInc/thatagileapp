import { getDataStore } from '../adapters';
import type { WorkItem } from '../../types';
import { collectSubtreeIdsInDeleteOrder, getSubtreeStats, type SubtreeStats } from './subtree';

export interface ResetBacklogPreview {
  companyWorkItemId: string;
  idsToDelete: string[];
  stats: SubtreeStats;
  totalCount: number;
}

/**
 * Get the Company WorkItem for the tenant (type === 'company', companyId === tenantId).
 * Returns the first match; normally there is one per tenant.
 */
function findCompanyWorkItem(items: WorkItem[], tenantId: string): WorkItem | null {
  return items.find((i) => i.type === 'company' && i.companyId === tenantId) ?? null;
}

/**
 * Collect all product-child subtree ids in delete order and stats.
 * Used for preview and for the actual reset.
 */
async function collectIdsAndStats(tenantId: string): Promise<{
  company: WorkItem;
  idsToDelete: string[];
  stats: SubtreeStats;
} | null> {
  const store = getDataStore();
  const items = await store.getWorkItems(tenantId);
  const company = findCompanyWorkItem(items, tenantId);
  if (!company) return null;

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
