import { WorkItemType } from '../types';

const CHILD_TYPES: Record<WorkItemType, WorkItemType[]> = {
  epic: ['feature'],
  feature: ['user-story'],
  'user-story': ['task', 'bug'],
  task: [],
  bug: [],
};

const PARENT_TYPES: Record<WorkItemType, WorkItemType[]> = {
  epic: [],
  feature: ['epic'],
  'user-story': ['feature'],
  task: ['user-story'],
  bug: ['user-story'],
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
  epic: 'Epic',
  feature: 'Feature',
  'user-story': 'User Story',
  task: 'Task',
  bug: 'Bug',
};

export function getTypeLabel(type: WorkItemType): string {
  return TYPE_LABELS[type] ?? type;
}
