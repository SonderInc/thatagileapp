/**
 * Runtime Firebase config: localStorage override or env.
 * Used by firebase.ts so Settings can switch to "my database" without rebuild.
 */

const STORAGE_KEY = 'thatagile_firebase_config';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

function isFirebaseConfig(obj: unknown): obj is FirebaseConfig {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.apiKey === 'string' &&
    typeof o.authDomain === 'string' &&
    typeof o.projectId === 'string'
  );
}

function fromEnv(): FirebaseConfig | null {
  const env = import.meta.env;
  const projectId = (env.VITE_FIREBASE_PROJECT_ID as string) || '';
  const apiKey = (env.VITE_FIREBASE_API_KEY as string) || '';
  if (!projectId || !apiKey) return null;
  const storageBucket =
    (env.VITE_FIREBASE_STORAGE_BUCKET as string) ||
    (projectId ? `${projectId}.appspot.com` : undefined);
  return {
    apiKey,
    authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
    projectId,
    storageBucket,
    messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || undefined,
    appId: (env.VITE_FIREBASE_APP_ID as string) || undefined,
    measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID as string) || undefined,
  };
}

/**
 * Returns effective Firebase config: localStorage override if set, else env.
 */
/**
 * Returns effective Firebase config. In production, storageBucket always comes from env (VITE_FIREBASE_STORAGE_BUCKET), not localStorage, so Netlify/env is source of truth for bucket.
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  const envConfig = fromEnv();
  if (typeof window === 'undefined') return envConfig;
  const bucketFromEnv =
    envConfig?.storageBucket ||
    (envConfig?.projectId ? `${envConfig.projectId}.appspot.com` : undefined);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isFirebaseConfig(parsed) && parsed.projectId && parsed.apiKey) {
        const storageBucket =
          import.meta.env.DEV
            ? parsed.storageBucket || (parsed.projectId ? `${parsed.projectId}.appspot.com` : undefined)
            : (bucketFromEnv ?? (parsed.projectId ? `${parsed.projectId}.appspot.com` : undefined));
        return { ...parsed, storageBucket };
      }
    }
  } catch {
    // ignore invalid JSON
  }
  if (envConfig) return { ...envConfig, storageBucket: bucketFromEnv };
  return envConfig;
}

/**
 * True when user has saved "my database" config in Settings (localStorage).
 */
export function hasFirebaseConfigOverride(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Save or clear Settings override. Caller should reload after save (e.g. window.location.reload()).
 */
export function setFirebaseConfigOverride(config: FirebaseConfig | null): void {
  if (typeof window === 'undefined') return;
  if (config === null) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (!config.projectId || !config.apiKey) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
