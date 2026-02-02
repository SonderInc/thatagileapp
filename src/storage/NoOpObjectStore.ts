/**
 * No-op object store when STORAGE_PROVIDER is not configured (e.g. firebase not set).
 * Future: S3/MinIO implementation.
 */
import type { IObjectStore } from './IObjectStore';

export const NoOpObjectStore: IObjectStore = {
  async upload() {
    throw new Error('Object storage not configured');
  },
  async getUrl() {
    throw new Error('Object storage not configured');
  },
  isConfigured: () => false,
};
