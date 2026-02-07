import type { WorkItemType } from './index';

/** Canonical framework settings: labels, enabled types, hierarchy. No framework-specific branching. */
export interface FrameworkSettings {
  version: '1.0';
  enabledWorkItemTypes: WorkItemType[];
  workItemLabels: Record<WorkItemType, string>;
  hierarchy: Record<WorkItemType, WorkItemType[]>;
  /** Display order for types in pickers/backlog (optional; when missing, derived from hierarchy). */
  workItemTypeOrder?: WorkItemType[];
  roles?: {
    boardAdminRoles?: string[];
  };
}

const CANONICAL_TYPES: WorkItemType[] = [
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

const DEFAULT_LABELS: Record<WorkItemType, string> = {
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

const DEFAULT_HIERARCHY: Record<WorkItemType, WorkItemType[]> = {
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

/** Default enabled types (original set; SAFe extras are hierarchy-only until a preset enables them). */
const DEFAULT_ENABLED_TYPES: WorkItemType[] = [
  'company',
  'product',
  'epic',
  'feature',
  'user-story',
  'task',
  'bug',
];

export const DEFAULT_FRAMEWORK_SETTINGS: FrameworkSettings = {
  version: '1.0',
  enabledWorkItemTypes: [...DEFAULT_ENABLED_TYPES],
  workItemLabels: { ...DEFAULT_LABELS },
  hierarchy: { ...DEFAULT_HIERARCHY },
  workItemTypeOrder: [...CANONICAL_TYPES],
};

export { CANONICAL_TYPES };
