import { getDataStore } from '../../lib/adapters';
import type { TerminologySettings } from './terminologyTypes';
import type { FrameworkId } from '../../glossary/packs/types';

export function getDefaultTerminologySettings(): TerminologySettings {
  return {
    activePackId: 'default',
    overrides: {},
  };
}

/** Load company-wide terminology (uses getCompanyTerminology: new path, fallback, backfill). */
export async function loadTerminologySettings(companyId: string): Promise<TerminologySettings> {
  const raw = await getDataStore().getCompanyTerminology(companyId);
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
  await getDataStore().setCompanyTerminology(
    companyId,
    {
      activePackId: settings.activePackId,
      overrides: settings.overrides,
    },
    uid
  );
}

/** Load product override; returns null if no override (caller should use company terminology). */
export async function loadProductTerminologyOverride(productId: string): Promise<TerminologySettings | null> {
  const raw = await getDataStore().getProductTerminologyOverride(productId);
  if (raw == null) return null;
  return {
    activePackId: raw.activePackId as FrameworkId,
    overrides: raw.overrides ?? {},
  };
}

export async function saveProductTerminologyOverride(
  productId: string,
  settings: TerminologySettings,
  uid: string
): Promise<void> {
  await getDataStore().setProductTerminologyOverride(
    productId,
    {
      activePackId: settings.activePackId,
      overrides: settings.overrides,
    },
    uid
  );
}

export async function removeProductTerminologyOverride(productId: string): Promise<void> {
  await getDataStore().deleteProductTerminologyOverride(productId);
}

/** Legacy: used only for backfill. Do not use for resolution. */
export async function loadProductTerminology(productId: string): Promise<TerminologySettings> {
  const raw = await getDataStore().getProductTerminology(productId);
  if (raw == null) return getDefaultTerminologySettings();
  return {
    activePackId: raw.activePackId as FrameworkId,
    overrides: raw.overrides ?? {},
  };
}

/** Legacy: prefer saveProductTerminologyOverride for product-specific edits. */
export async function saveProductTerminology(
  productId: string,
  settings: TerminologySettings,
  uid: string
): Promise<void> {
  await getDataStore().setProductTerminology(
    productId,
    {
      activePackId: settings.activePackId,
      overrides: settings.overrides,
    },
    uid
  );
}
