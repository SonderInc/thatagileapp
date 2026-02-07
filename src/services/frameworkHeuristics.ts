/**
 * Framework migration heuristics: allowed child check and deterministic new-parent resolution.
 * No preset-specific branching; uses hierarchy from preset/config.
 */

import type { WorkItem } from '../types';
import type { FrameworkPreset, DeterministicParentResult } from '../lib/frameworkTypes';

export function isAllowedChild(
  parentType: string,
  childType: string,
  hierarchy: Record<string, string[]>
): boolean {
  const allowed = hierarchy[parentType];
  if (!Array.isArray(allowed)) return false;
  return allowed.includes(childType);
}

/**
 * Find a deterministic new parent for an item when current parent is invalid.
 * Returns null and caller should add to reviewQueue when ambiguous.
 */
export function findDeterministicNewParent(
  item: WorkItem,
  allItems: WorkItem[],
  preset: FrameworkPreset
): DeterministicParentResult | null {
  const hierarchy = preset.hierarchy;
  const enabledSet = new Set(preset.enabledTypes);

  const parent = item.parentId ? allItems.find((i) => i.id === item.parentId) : null;
  if (parent && isAllowedChild(parent.type, item.type, hierarchy as Record<string, string[]>)) {
    return { parentId: parent.id, confidence: 'HIGH' };
  }

  const productId = getProductIdForItem(item.id, allItems);
  const candidates: { id: string; type: string }[] = [];

  for (const other of allItems) {
    if (other.companyId !== item.companyId) continue;
    if (other.id === item.id) continue;
    if (!enabledSet.has(other.type as never)) continue;
    if (!isAllowedChild(other.type, item.type, hierarchy as Record<string, string[]>)) continue;
    const otherProductId = getProductIdForItem(other.id, allItems);
    if (productId && otherProductId && otherProductId !== productId) continue;
    candidates.push({ id: other.id, type: other.type });
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { parentId: candidates[0]!.id, confidence: 'HIGH' };

  const underSameProduct = candidates.filter((c) => {
    const cProductId = getProductIdForItem(c.id, allItems);
    return cProductId === productId;
  });
  if (underSameProduct.length === 1) return { parentId: underSameProduct[0]!.id, confidence: 'HIGH' };
  if (underSameProduct.length > 1) return { parentId: underSameProduct[0]!.id, confidence: 'LOW' };

  return { parentId: candidates[0]!.id, confidence: 'LOW' };
}

function getProductIdForItem(itemId: string, items: WorkItem[]): string | null {
  let current = items.find((i) => i.id === itemId);
  while (current) {
    if (current.type === 'product') return current.id;
    current = current.parentId ? items.find((i) => i.id === current!.parentId) ?? undefined : undefined;
  }
  return null;
}
