import { getDataStore } from '../../lib/adapters';
import type { TerminologySettings } from './terminologyTypes';
import type { FrameworkId } from '../../glossary/packs/types';

export function getDefaultTerminologySettings(): TerminologySettings {
  return {
    activePackId: 'default',
    overrides: {},
  };
}

export async function loadTerminologySettings(companyId: string): Promise<TerminologySettings> {
  const raw = await getDataStore().getTerminologySettings(companyId);
  if (raw == null) return getDefaultTerminologySettings();
  return {
    activePackId: raw.activePackId as FrameworkId,
    overrides: raw.overrides ?? {},
  };
}

export async function saveTerminologySettings(
  companyId: string,
  settings: TerminologySettings,
  uid: string
): Promise<void> {
  await getDataStore().setTerminologySettings(
    companyId,
    {
      activePackId: settings.activePackId,
      overrides: settings.overrides,
    },
    uid
  );
}
