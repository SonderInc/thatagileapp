/**
 * Frontend config — 12-factor: all from env, no hardcoded URLs/IDs/secrets.
 * Required for cloud SaaS and on-prem/local server deployment.
 * Mode differences (auth, API, email verification) driven by DEPLOYMENT_MODE only.
 */

const env = import.meta.env;

export type DeploymentMode = 'saas' | 'onprem' | 'airgapped';
export type AuthProvider = 'firebase' | 'oidc' | 'local';
export type DataProvider = 'firestore' | 'postgres';
export type StorageProvider = 'firebase' | 's3';

const rawMode = (env.VITE_DEPLOYMENT_MODE as string) || 'saas';
export const DEPLOYMENT_MODE: DeploymentMode =
  rawMode === 'onprem' || rawMode === 'airgapped' ? rawMode : 'saas';

export const config = {
  /** Deployment mode: saas (hosted) | onprem (internal) | airgapped (no outbound). */
  DEPLOYMENT_MODE,
  /** Base URL of the app (e.g. https://app.example.com or / for relative). */
  APP_BASE_URL: (env.VITE_APP_BASE_URL as string) || '',
  /** API base URL for backend (e.g. https://api.example.com). Empty = same origin. */
  API_BASE_URL: (env.VITE_API_BASE_URL as string) || '',
  /** Auth provider: firebase | oidc | local. Override per env; default by mode. */
  AUTH_PROVIDER: (env.VITE_AUTH_PROVIDER as AuthProvider) ||
    (DEPLOYMENT_MODE === 'saas' ? 'firebase' : 'firebase'),
  /** Data provider: firestore | postgres. */
  DATA_PROVIDER: (env.VITE_DATA_PROVIDER as DataProvider) || 'firestore',
  /** Storage provider: firebase | s3. */
  STORAGE_PROVIDER: (env.VITE_STORAGE_PROVIDER as StorageProvider) || 'firebase',
  /** Log level: debug | info | warn | error. */
  LOG_LEVEL: (env.VITE_LOG_LEVEL as string) || 'info',
  /** Tenant id for single-tenant/on-prem (optional). */
  TENANT_ID: (env.VITE_TENANT_ID as string) || '',
  /** Email verification required (saas) vs optional/offline (onprem/airgapped). Driven by mode only. */
  EMAIL_VERIFICATION_REQUIRED: DEPLOYMENT_MODE === 'saas',
  /** Use Netlify Function proxy for logo upload (avoids Firebase Storage CORS). Set VITE_USE_UPLOAD_PROXY=true on Netlify. */
  USE_UPLOAD_PROXY: (env.VITE_USE_UPLOAD_PROXY as string) === 'true',
} as const;
