/**
 * Frontend config — 12-factor: all from env, no hardcoded URLs/IDs/secrets.
 * Required for cloud SaaS and on-prem/local server deployment.
 */

const env = import.meta.env;

export type AuthProvider = 'firebase' | 'oidc' | 'local';
export type DataProvider = 'firestore' | 'postgres';
export type StorageProvider = 'firebase' | 's3';

export const config = {
  /** Base URL of the app (e.g. https://app.example.com or / for relative). */
  APP_BASE_URL: (env.VITE_APP_BASE_URL as string) || '',
  /** API base URL for backend (e.g. https://api.example.com). Empty = same origin. */
  API_BASE_URL: (env.VITE_API_BASE_URL as string) || '',
  /** Auth provider: firebase | oidc | local. */
  AUTH_PROVIDER: (env.VITE_AUTH_PROVIDER as AuthProvider) || 'firebase',
  /** Data provider: firestore | postgres. */
  DATA_PROVIDER: (env.VITE_DATA_PROVIDER as DataProvider) || 'firestore',
  /** Storage provider: firebase | s3. */
  STORAGE_PROVIDER: (env.VITE_STORAGE_PROVIDER as StorageProvider) || 'firebase',
  /** Log level: debug | info | warn | error. */
  LOG_LEVEL: (env.VITE_LOG_LEVEL as string) || 'info',
  /** Tenant id for single-tenant/on-prem (optional). */
  TENANT_ID: (env.VITE_TENANT_ID as string) || '',
} as const;
