import type { WorkItemType, CompanyType } from '../types';

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
