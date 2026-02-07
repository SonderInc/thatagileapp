import type { WorkItemType, ProductHierarchyConfig } from '../types';

/** Default enabled types for a product when no config exists (product-level types only). */
export const DEFAULT_HIERARCHY_SAFE: WorkItemType[] = [
  'epic',
  'feature',
  'user-story',
  'task',
  'bug',
];

/** All work item types (for settings UI). */
export const ALL_WORK_ITEM_TYPES: WorkItemType[] = [
  'company',
  'product',
  'epic',
  'feature',
  'user-story',
  'task',
  'bug',
  'initiative',
  'capability',
  'strategic-theme',
  'solution',
];

const ALL_KNOWN_TYPES = ALL_WORK_ITEM_TYPES;

/** Ensures config has valid enabledTypes and order: no unknown types, order contains all enabled, non-empty, de-duped. */
export function ensureValidHierarchy(
  config: Partial<ProductHierarchyConfig> | null
): ProductHierarchyConfig {
  const rawEnabled = config?.enabledTypes ?? DEFAULT_HIERARCHY_SAFE;
  const enabledSet = new Set(ALL_KNOWN_TYPES.filter((t) => rawEnabled.includes(t)));
  const enabledTypes = enabledSet.size > 0 ? [...enabledSet] : [...DEFAULT_HIERARCHY_SAFE];
  const rawOrder = config?.order ?? [...DEFAULT_HIERARCHY_SAFE];
  const order: WorkItemType[] = [];
  for (const t of rawOrder) {
    if (ALL_KNOWN_TYPES.includes(t) && !order.includes(t)) order.push(t);
  }
  for (const t of enabledTypes) {
    if (!order.includes(t)) order.push(t);
  }
  if (order.length === 0) order.push(...DEFAULT_HIERARCHY_SAFE);
  return {
    productId: config?.productId ?? '',
    enabledTypes,
    order,
    updatedAt: config?.updatedAt instanceof Date ? config.updatedAt : new Date(),
    updatedBy: config?.updatedBy,
  };
}

const CHILD_TYPES: Record<WorkItemType, WorkItemType[]> = {
  company: ['product'],
  product: ['epic', 'feature'],
  epic: ['feature', 'user-story'],
  feature: ['user-story'],
  'user-story': ['task', 'bug'],
  task: [],
  bug: [],
  initiative: ['epic', 'feature'],
  capability: ['feature'],
  'strategic-theme': ['initiative'],
  solution: ['capability'],
};

const PARENT_TYPES: Record<WorkItemType, WorkItemType[]> = {
  company: [],
  product: ['company'],
  epic: ['product'],
  feature: ['epic', 'initiative', 'capability'],
  'user-story': ['feature', 'epic'],
  task: ['user-story'],
  bug: ['user-story'],
  initiative: ['product', 'strategic-theme'],
  capability: ['product', 'solution'],
  'strategic-theme': ['product'],
  solution: ['product'],
};

export function getAllowedChildTypes(parentType: WorkItemType): WorkItemType[] {
  return CHILD_TYPES[parentType] ?? [];
}

export function getAllowedParentTypes(childType: WorkItemType): WorkItemType[] {
  return PARENT_TYPES[childType] ?? [];
}

export function canBeChildOf(childType: WorkItemType, parentType: WorkItemType): boolean {
  return getAllowedChildTypes(parentType).includes(childType);
}

const TYPE_LABELS: Record<WorkItemType, string> = {
  company: 'Company',
  product: 'Product',
  epic: 'Epic',
  feature: 'Feature',
  'user-story': 'User Story',
  task: 'Task',
  bug: 'Bug',
  initiative: 'Initiative',
  capability: 'Capability',
  'strategic-theme': 'Strategic Theme',
  solution: 'Solution',
};

export function getTypeLabel(type: WorkItemType): string {
  return TYPE_LABELS[type] ?? type;
}
