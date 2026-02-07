import { getDataStore } from '../lib/adapters';
import type { FrameworkSettings } from '../types/frameworkSettings';
import { DEFAULT_FRAMEWORK_SETTINGS } from '../types/frameworkSettings';
import { validateFrameworkSettings } from '../utils/validateFrameworkSettings';
import { getPresetById, type PresetId } from '../presets';

function mergeSettings(base: FrameworkSettings, overrides: Partial<FrameworkSettings>): FrameworkSettings {
  const next: FrameworkSettings = {
    version: base.version,
    enabledWorkItemTypes: overrides.enabledWorkItemTypes ?? base.enabledWorkItemTypes,
    workItemLabels: { ...base.workItemLabels, ...(overrides.workItemLabels ?? {}) },
    hierarchy: { ...base.hierarchy, ...(overrides.hierarchy ?? {}) },
    workItemTypeOrder: overrides.workItemTypeOrder ?? base.workItemTypeOrder,
    roles: overrides.roles ?? base.roles,
  };
  return next;
}

/**
 * Resolve effective framework settings: default + company + optional product overrides.
 * Validates result; on invalid, returns default and logs.
 */
export async function resolveEffectiveSettings(params: {
  companyId: string;
  productId?: string;
}): Promise<FrameworkSettings> {
  const { companyId, productId } = params;
  let effective: FrameworkSettings = { ...DEFAULT_FRAMEWORK_SETTINGS };

  const companyDoc = await getDataStore().getCompanySettings(companyId);
  if (companyDoc?.settings) {
    effective = mergeSettings(effective, companyDoc.settings);
  }

  if (productId) {
    const productDoc = await getDataStore().getProductSettings(productId);
    if (productDoc?.overrides && Object.keys(productDoc.overrides).length > 0) {
      effective = mergeSettings(effective, productDoc.overrides);
    }
  }

  const result = validateFrameworkSettings(effective);
  if (!result.ok) {
    console.error('[frameworkSettings] Effective settings invalid, using default:', result.errors);
    return { ...DEFAULT_FRAMEWORK_SETTINGS };
  }
  return effective;
}

export async function applyCompanyPreset(companyId: string, presetId: PresetId, uid: string): Promise<void> {
  const settings = getPresetById(presetId);
  const result = validateFrameworkSettings(settings);
  if (!result.ok) throw new Error(`Invalid preset: ${result.errors.join('; ')}`);
  await getDataStore().setCompanySettings(companyId, presetId, settings, uid);
}

export async function applyProductPreset(
  productId: string,
  companyId: string,
  presetId: PresetId,
  uid: string
): Promise<void> {
  const settings = getPresetById(presetId);
  const result = validateFrameworkSettings(settings);
  if (!result.ok) throw new Error(`Invalid preset: ${result.errors.join('; ')}`);
  await getDataStore().setProductSettings(productId, companyId, presetId, settings, uid);
}

export async function getCompanySettings(companyId: string): Promise<{ presetId: string | null; settings: FrameworkSettings } | null> {
  return getDataStore().getCompanySettings(companyId);
}

export async function getProductSettings(productId: string): Promise<{ presetId: string | null; overrides: Partial<FrameworkSettings> } | null> {
  return getDataStore().getProductSettings(productId);
}
