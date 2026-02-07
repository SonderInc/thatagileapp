/**
 * Company framework config: read/write companies/{companyId}/settings/framework.
 * getEffectiveFramework drives runtime behavior (no preset branching).
 */

import {
  getCompanyFrameworkConfig as getFirestoreFrameworkConfig,
  setCompanyFrameworkConfig as setFirestoreFrameworkConfig,
} from '../lib/firestore';
import { getFrameworkPreset, getDefaultFrameworkPreset } from '../lib/frameworkPresets';
import type { CompanyFrameworkConfig } from '../lib/frameworkTypes';
import { getDataStore } from '../lib/adapters';
import type { FrameworkSettings } from '../types/frameworkSettings';

/**
 * Load company framework config from companies/{companyId}/settings/framework.
 */
export async function getCompanyFrameworkConfig(companyId: string): Promise<CompanyFrameworkConfig | null> {
  const raw = await getFirestoreFrameworkConfig(companyId);
  if (!raw) return null;
  return {
    presetKey: raw.presetKey,
    presetVersion: raw.presetVersion,
    enabledTypes: raw.enabledTypes,
    hierarchy: raw.hierarchy,
    glossary: raw.glossary,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

/**
 * Set company framework to a preset. Writes to companies/{companyId}/settings/framework
 * and syncs to companySettings so existing resolveEffectiveSettings still works.
 */
export async function setCompanyFrameworkPreset(
  companyId: string,
  presetKey: string,
  userId: string
): Promise<void> {
  const preset = getFrameworkPreset(presetKey);
  await setFirestoreFrameworkConfig(
    companyId,
    {
      presetKey: preset.presetKey,
      presetVersion: preset.presetVersion,
      enabledTypes: preset.enabledTypes,
      hierarchy: preset.hierarchy,
      glossary: preset.glossary,
    },
    userId
  );
  const settings: FrameworkSettings = {
    version: '1.0',
    enabledWorkItemTypes: preset.enabledTypes,
    workItemLabels: preset.glossary as FrameworkSettings['workItemLabels'],
    hierarchy: preset.hierarchy as FrameworkSettings['hierarchy'],
    workItemTypeOrder: preset.workItemTypeOrder,
  };
  await getDataStore().setCompanySettings(companyId, presetKey, settings, userId);
}

/**
 * Effective framework for a company: new path first, then fallback to companySettings.
 */
export async function getEffectiveFramework(companyId: string): Promise<CompanyFrameworkConfig> {
  const fromNewPath = await getFirestoreFrameworkConfig(companyId);
  if (fromNewPath) {
    return {
      presetKey: fromNewPath.presetKey,
      presetVersion: fromNewPath.presetVersion,
      enabledTypes: fromNewPath.enabledTypes,
      hierarchy: fromNewPath.hierarchy,
      glossary: fromNewPath.glossary,
      updatedAt: fromNewPath.updatedAt,
      updatedBy: fromNewPath.updatedBy,
    };
  }
  const legacy = await getDataStore().getCompanySettings(companyId);
  if (legacy?.settings) {
    return {
      presetKey: legacy.presetId ?? 'safe-essential',
      presetVersion: legacy.settings.version,
      enabledTypes: legacy.settings.enabledWorkItemTypes,
      hierarchy: legacy.settings.hierarchy,
      glossary: legacy.settings.workItemLabels as Record<string, string>,
      updatedAt: new Date(),
      updatedBy: '',
    };
  }
  const defaultPreset = getDefaultFrameworkPreset();
  return {
    presetKey: defaultPreset.presetKey,
    presetVersion: defaultPreset.presetVersion,
    enabledTypes: defaultPreset.enabledTypes,
    hierarchy: defaultPreset.hierarchy,
    glossary: defaultPreset.glossary,
    updatedAt: new Date(),
    updatedBy: '',
  };
}
