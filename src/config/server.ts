/**
 * Backend config — for Node/server only. Read via process.env.
 * Used by API server, install scripts, or any server-side process.
 * DEPLOYMENT_MODE controls auth selection, API base URL, email verification.
 */

export type DeploymentMode = 'saas' | 'onprem' | 'airgapped';

const rawMode = process.env.DEPLOYMENT_MODE || 'saas';
export const DEPLOYMENT_MODE: DeploymentMode =
  rawMode === 'onprem' || rawMode === 'airgapped' ? rawMode : 'saas';

export const serverConfig = {
  DEPLOYMENT_MODE,
  /** API base URL (for server to advertise or proxy to). */
  API_BASE_URL: process.env.API_BASE_URL || '',
  /** Auth provider: firebase | oidc | local. */
  AUTH_PROVIDER: process.env.AUTH_PROVIDER || 'firebase',
  /** Data provider: firestore | postgres. */
  DATA_PROVIDER: process.env.DATA_PROVIDER || 'firestore',
  /** Storage provider: firebase | s3. */
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'firebase',
  /** Port for API server. */
  PORT: parseInt(process.env.PORT || '3000', 10),
  /** Data directory (e.g. /var/lib/app). */
  DATA_DIR: process.env.DATA_DIR || process.env.TMPDIR || '/tmp',
  /** Email verification required (saas) vs optional (onprem/airgapped). */
  EMAIL_VERIFICATION_REQUIRED: DEPLOYMENT_MODE === 'saas',
} as const;
