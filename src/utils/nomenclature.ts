import type { WorkItemType, CompanyType, Role } from '../types';
import { ROLE_LABELS } from '../types';

const SOFTWARE_LABELS: Record<WorkItemType, string> = {
  company: 'Company',
  product: 'Product',
  epic: 'Epic',
  feature: 'Feature',
  'user-story': 'User Story',
  task: 'Task',
  bug: 'Bug',
};

const TRAINING_LABELS: Record<WorkItemType, string> = {
  ...SOFTWARE_LABELS,
  epic: 'Program',
};

const TYPE_LABELS_BY_COMPANY_TYPE: Record<CompanyType, Record<WorkItemType, string>> = {
  software: SOFTWARE_LABELS,
  training: TRAINING_LABELS,
};

/**
 * Returns the display label for a work item type for the given company type.
 * Defaults to software nomenclature when companyType is missing.
 */
export function getTypeLabel(type: WorkItemType, companyType?: CompanyType | null): string {
  const key = companyType === 'training' ? 'training' : 'software';
  const labels = TYPE_LABELS_BY_COMPANY_TYPE[key];
  return labels[type] ?? type;
}

/** Training company role labels (subset; others fall back to ROLE_LABELS). */
const TRAINING_ROLE_LABELS: Partial<Record<Role, string>> = {
  admin: 'Admin',
  hr: 'HR',
  developer: 'Developer',
  'scrum-master-team-coach': 'Compassion Course Facilitator',
  'rte-team-of-teams-coach': 'Event Manager',
  'product-manager': 'Program Manager',
  customer: 'Participant',
};

/**
 * Returns the display label for a role for the given company type.
 * Training companies use training-specific labels where defined; otherwise ROLE_LABELS.
 */
export function getRoleLabel(role: Role, companyType?: CompanyType | null): string {
  if (companyType === 'training' && TRAINING_ROLE_LABELS[role] != null) {
    return TRAINING_ROLE_LABELS[role]!;
  }
  return ROLE_LABELS[role];
}
