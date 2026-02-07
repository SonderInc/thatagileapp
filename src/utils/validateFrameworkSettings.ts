import type { FrameworkSettings } from '../types/frameworkSettings';
import type { WorkItemType } from '../types';
import { CANONICAL_TYPES } from '../types/frameworkSettings';

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateFrameworkSettings(settings: FrameworkSettings): ValidationResult {
  const errors: string[] = [];

  if (settings.version !== '1.0') {
    errors.push('version must be "1.0"');
  }

  if (!Array.isArray(settings.enabledWorkItemTypes) || settings.enabledWorkItemTypes.length === 0) {
    errors.push('enabledWorkItemTypes must be a non-empty array');
  }

  const typeSet = new Set(CANONICAL_TYPES);
  if (settings.enabledWorkItemTypes) {
    for (const t of settings.enabledWorkItemTypes) {
      if (!typeSet.has(t)) errors.push(`enabledWorkItemTypes contains unknown type: ${t}`);
    }
  }

  if (!settings.workItemLabels || typeof settings.workItemLabels !== 'object') {
    errors.push('workItemLabels must be an object');
  } else {
    for (const key of CANONICAL_TYPES) {
      if (!(key in settings.workItemLabels)) {
        errors.push(`workItemLabels missing key: ${key}`);
      } else {
        const v = settings.workItemLabels[key as WorkItemType];
        if (typeof v !== 'string' || v.trim() === '') {
          errors.push(`workItemLabels.${key} must be a non-empty string`);
        }
      }
    }
  }

  if (!settings.hierarchy || typeof settings.hierarchy !== 'object') {
    errors.push('hierarchy must be an object');
  } else {
    for (const key of CANONICAL_TYPES) {
      if (!(key in settings.hierarchy)) {
        errors.push(`hierarchy missing key: ${key}`);
      } else {
        const children = settings.hierarchy[key as WorkItemType];
        if (!Array.isArray(children)) {
          errors.push(`hierarchy.${key} must be an array`);
        } else {
          for (const c of children) {
            if (!typeSet.has(c)) errors.push(`hierarchy.${key} contains unknown type: ${c}`);
            if (c === key) errors.push(`hierarchy.${key} must not contain self-reference`);
          }
        }
      }
    }
    if (settings.enabledWorkItemTypes?.length) {
      const enabledSet = new Set(settings.enabledWorkItemTypes);
      for (const key of CANONICAL_TYPES) {
        const children = settings.hierarchy[key as WorkItemType] ?? [];
        for (const c of children) {
          if (!enabledSet.has(c)) {
            errors.push(`hierarchy.${key} has child ${c} which is not in enabledWorkItemTypes`);
          }
        }
      }
    }
  }

  if (settings.workItemTypeOrder !== undefined) {
    if (!Array.isArray(settings.workItemTypeOrder)) {
      errors.push('workItemTypeOrder must be an array when present');
    } else {
      for (const t of settings.workItemTypeOrder) {
        if (!typeSet.has(t)) errors.push(`workItemTypeOrder contains unknown type: ${t}`);
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
