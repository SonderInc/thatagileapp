import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';
import type { FirebaseConfig } from './firebaseConfig';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

/**
 * Initialize or re-initialize Firebase with the given config (Phase 2: per-tenant config).
 * Call this before any Firebase use. If config is null or missing projectId/apiKey, clears state.
 */
export function initFirebase(config: FirebaseConfig | null): void {
  if (app) {
    try {
      deleteApp(app);
    } catch {
      // ignore
    }
    app = null;
    auth = null;
    db = null;
    storage = null;
    analytics = null;
  }
  if (!config?.projectId || !config?.apiKey) {
    if (import.meta.env.DEV) {
      console.warn(
        '[Firebase] Not configured. Create .env.local with VITE_FIREBASE_* or use Settings to paste your Firebase config, then reload.'
      );
    }
    return;
  }
  const resolvedBucket = config.storageBucket || `${config.projectId}.appspot.com`;
  const configWithBucket = { ...config, storageBucket: resolvedBucket };
  app = initializeApp(configWithBucket);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  if (config.measurementId && import.meta.env.VITE_FIREBASE_ANALYTICS_ENABLED) {
    analytics = getAnalytics(app);
  }
  if (import.meta.env.DEV) {
    console.log('[Firebase] Connected to project:', config.projectId);
    console.log('[Firebase] Storage bucket:', resolvedBucket);
    if (!resolvedBucket) {
      console.warn(
        '[Firebase] Storage bucket missing; set VITE_FIREBASE_STORAGE_BUCKET to match Firebase Console (Project settings → General → Your apps).'
      );
    } else if (
      config.projectId &&
      !resolvedBucket.includes(config.projectId)
    ) {
      console.warn(
        '[Firebase] Storage bucket may be inconsistent with projectId:',
        resolvedBucket,
        'vs project',
        config.projectId,
        '— ensure VITE_FIREBASE_STORAGE_BUCKET matches Firebase Console.'
      );
    }
  }
}

export { db, auth, storage, analytics };
export const isFirebaseConfigured = (): boolean => !!db;
export const getFirebaseProjectId = (): string | null =>
  (app?.options?.projectId as string | undefined) ?? null;
