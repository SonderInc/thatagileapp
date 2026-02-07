/**
 * Framework presets map (data only). Built from existing preset registry.
 * No preset-specific branching; all behavior driven by preset data.
 */

import type { FrameworkPreset, FrameworkPresetKey } from './frameworkTypes';
import { FRAMEWORK_PRESETS, type PresetId } from '../presets';
import type { FrameworkSettings } from '../types/frameworkSettings';
import type { WorkItemType } from '../types';

const PRESET_VERSION = '1.0';

function settingsToPreset(presetKey: string, settings: FrameworkSettings): FrameworkPreset {
  return {
    presetKey,
    presetVersion: PRESET_VERSION,
    enabledTypes: settings.enabledWorkItemTypes,
    hierarchy: settings.hierarchy as Record<string, WorkItemType[]>,
    glossary: settings.workItemLabels as Record<string, string>,
    workItemTypeOrder: settings.workItemTypeOrder,
  };
}

const PRESETS_MAP = new Map<FrameworkPresetKey, FrameworkPreset>();

for (const entry of FRAMEWORK_PRESETS) {
  PRESETS_MAP.set(entry.id, settingsToPreset(entry.id, entry.settings));
}

/** Get preset by key. Throws if unknown. */
export function getFrameworkPreset(presetKey: FrameworkPresetKey): FrameworkPreset {
  const preset = PRESETS_MAP.get(presetKey);
  if (!preset) throw new Error(`Unknown framework preset: ${presetKey}`);
  return preset;
}

/** All preset keys (for UI dropdown). */
export function getFrameworkPresetKeys(): FrameworkPresetKey[] {
  return FRAMEWORK_PRESETS.map((p) => p.id);
}

/** Preset display name by key. */
export function getFrameworkPresetName(presetKey: FrameworkPresetKey): string {
  const entry = FRAMEWORK_PRESETS.find((p) => p.id === presetKey);
  return entry?.name ?? presetKey;
}

/** Preset description by key. */
export function getFrameworkPresetDescription(presetKey: FrameworkPresetKey): string {
  const entry = FRAMEWORK_PRESETS.find((p) => p.id === presetKey);
  return entry?.description ?? '';
}

/** Default preset key when company has no config (e.g. safe-essential). */
export const DEFAULT_FRAMEWORK_PRESET_KEY: FrameworkPresetKey = 'safe-essential';

/** Get default preset. */
export function getDefaultFrameworkPreset(): FrameworkPreset {
  return getFrameworkPreset(DEFAULT_FRAMEWORK_PRESET_KEY);
}

/** Type-safe preset id for use with existing PresetId. */
export type { PresetId };
