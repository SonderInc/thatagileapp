/**
 * Firebase Storage implementation of IObjectStore.
 * Stores files under tenants/{tenantId}/{path}; returns public download URLs.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import type { IObjectStore } from './IObjectStore';

export const FirebaseStorageObjectStore: IObjectStore = {
  async upload(tenantId: string, path: string, blob: Blob): Promise<string> {
    if (!storage) throw new Error('Firebase Storage not configured');
    const fullPath = `tenants/${tenantId}/${path}`;
    const storageRef = ref(storage, fullPath);
    await uploadBytes(storageRef, blob);
    return fullPath;
  },

  async getUrl(_tenantId: string, key: string): Promise<string> {
    if (!storage) throw new Error('Firebase Storage not configured');
    const storageRef = ref(storage, key);
    return getDownloadURL(storageRef);
  },

  isConfigured(): boolean {
    return !!storage;
  },
};
