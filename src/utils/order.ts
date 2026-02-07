/**
 * Shared sort utilities for work-item sibling order.
 * No store imports; structural typing only.
 */

export const WORK_ITEM_TYPE_ORDER = [
  'company',
  'product',
  'epic',
  'feature',
  'user-story',
  'task',
  'bug',
] as const;

export function getTypeSortIndex(type: string): number {
  const i = WORK_ITEM_TYPE_ORDER.indexOf(type as (typeof WORK_ITEM_TYPE_ORDER)[number]);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

export function getTypeSortIndexFromOrder(type: string, order: string[]): number {
  const i = order.indexOf(type);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

export function compareWorkItemOrder(
  a: { order?: number | null; type: string; title: string },
  b: { order?: number | null; type: string; title: string }
): number {
  const orderA = a.order ?? Number.POSITIVE_INFINITY;
  const orderB = b.order ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  const typeDiff = getTypeSortIndex(a.type) - getTypeSortIndex(b.type);
  if (typeDiff !== 0) return typeDiff;
  return a.title.localeCompare(b.title);
}

/** Sort by custom type order then title (e.g. per-product hierarchy order). */
export function compareWorkItemOrderWithOrder(
  a: { order?: number | null; type: string; title: string },
  b: { order?: number | null; type: string; title: string },
  typeOrder: string[]
): number {
  const orderA = a.order ?? Number.POSITIVE_INFINITY;
  const orderB = b.order ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  const typeDiff = getTypeSortIndexFromOrder(a.type, typeOrder) - getTypeSortIndexFromOrder(b.type, typeOrder);
  if (typeDiff !== 0) return typeDiff;
  return a.title.localeCompare(b.title);
}
