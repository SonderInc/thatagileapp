/**
 * Phase 2: resolve Firebase config per tenant (slug from path).
 * Fetches from Netlify function; falls back to getFirebaseConfig() when useDefault or on error.
 */

import { getFirebaseConfig } from './firebaseConfig';
import type { FirebaseConfig } from './firebaseConfig';

function getPathSlug(): string {
  if (typeof window === 'undefined') return '';
  const segment = window.location.pathname.slice(1).split('/')[0];
  return segment ?? '';
}

/**
 * Returns Firebase config for the current context: from tenant registry (by path slug) or default (env/localStorage).
 */
export async function getBootstrapFirebaseConfig(): Promise<FirebaseConfig | null> {
  const slug = getPathSlug();
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const url = slug
    ? `${base}/.netlify/functions/firebase-config?slug=${encodeURIComponent(slug)}`
    : `${base}/.netlify/functions/firebase-config`;
  try {
    const res = await fetch(url);
    if (!res.ok) return getFirebaseConfig();
    const data = (await res.json()) as { useDefault?: boolean; projectId?: string; apiKey?: string; authDomain?: string; storageBucket?: string; messagingSenderId?: string; appId?: string; measurementId?: string };
    if (data.useDefault === true || !data.projectId || !data.apiKey) return getFirebaseConfig();
    return {
      projectId: data.projectId,
      apiKey: data.apiKey,
      authDomain: data.authDomain ?? `${data.projectId}.firebaseapp.com`,
      storageBucket: data.storageBucket ?? `${data.projectId}.appspot.com`,
      messagingSenderId: data.messagingSenderId,
      appId: data.appId,
      measurementId: data.measurementId,
    };
  } catch {
    return getFirebaseConfig();
  }
}
