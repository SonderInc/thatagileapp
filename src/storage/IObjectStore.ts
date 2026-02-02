/**
 * Object/storage interface — Firebase Storage, S3, MinIO, etc.
 * Use for file uploads; signed URLs for access.
 * UI must use this; no direct cloud storage imports.
 */
export interface IObjectStore {
  /** Upload and return a stable key/path (tenant-aware). */
  upload(tenantId: string, path: string, blob: Blob): Promise<string>;
  /** Get a signed or public URL for the key. */
  getUrl(tenantId: string, key: string): Promise<string>;
  /** Whether the provider is configured. */
  isConfigured(): boolean;
}
