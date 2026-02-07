import type { GlossaryKey } from '../../glossary/glossaryKeys';
import { TERMS } from '../../glossary/terms';
import { PACKS } from '../../glossary/packs';
import type { LabelPack } from '../../glossary/packs/types';
import type { TerminologySettings } from './terminologyTypes';

export function getPackById(id: string): LabelPack {
  const pack = PACKS.find((p) => p.id === id);
  return pack ?? PACKS[0]!;
}

export function resolveLabel(key: GlossaryKey, settings?: TerminologySettings | null): string {
  const overrides = settings?.overrides;
  if (overrides && overrides[key] != null && overrides[key] !== '') {
    return overrides[key]!;
  }
  const pack = settings?.activePackId ? getPackById(settings.activePackId) : PACKS[0]!;
  const packLabel = pack.labels[key];
  if (packLabel != null && packLabel !== '') return packLabel;
  const term = TERMS.find((t) => t.key === key);
  return term?.defaultLabel ?? key;
}

/** Unique list: default label + all pack labels for this key (for dropdown choices). */
export function getAllChoicesForKey(key: GlossaryKey): string[] {
  const term = TERMS.find((t) => t.key === key);
  const defaultLabel = term?.defaultLabel ?? key;
  const set = new Set<string>([defaultLabel]);
  for (const pack of PACKS) {
    const label = pack.labels[key];
    if (label != null && label !== '') set.add(label);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
