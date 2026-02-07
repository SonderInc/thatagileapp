import { getDataStore } from '../lib/adapters';
import { ensureValidHierarchy } from '../utils/hierarchy';
import type { ProductHierarchyConfig } from '../types';

/**
 * Get hierarchy config for a product. If no document exists, returns default config (does not write).
 */
export async function getHierarchyConfig(productId: string): Promise<ProductHierarchyConfig> {
  const raw = await getDataStore().getProductHierarchyConfig(productId);
  return ensureValidHierarchy(raw ? { ...raw, productId } : { productId });
}

/**
 * Save hierarchy config for a product.
 */
export async function upsertHierarchyConfig(
  productId: string,
  config: Pick<ProductHierarchyConfig, 'enabledTypes' | 'order'>,
  userId: string
): Promise<void> {
  const valid = ensureValidHierarchy({ ...config, productId });
  await getDataStore().setProductHierarchyConfig(productId, { enabledTypes: valid.enabledTypes, order: valid.order }, userId);
}

/**
 * Subscribe to hierarchy config for a product (e.g. for settings page). Returns unsubscribe.
 */
export function subscribeHierarchyConfig(
  productId: string,
  callback: (config: ProductHierarchyConfig | null) => void
): () => void {
  return getDataStore().subscribeProductHierarchyConfig(productId, callback);
}
