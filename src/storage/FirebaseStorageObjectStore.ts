/**
 * Firebase Storage implementation of IObjectStore.
 * Stores files under tenants/{tenantId}/{path}; returns public download URLs.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import type { IObjectStore } from './IObjectStore';

function hasAuth(): boolean {
  return !!(auth && auth.currentUser);
}

export const FirebaseStorageObjectStore: IObjectStore = {
  async upload(tenantId: string, path: string, blob: Blob): Promise<string> {
    if (!storage) throw new Error('Firebase Storage not configured');
    if (!hasAuth()) {
      throw new Error('Storage upload requires signed-in user');
    }
    if (import.meta.env.DEV) {
      console.log('[Firebase Storage] upload: request.auth exists', hasAuth());
    }
    const fullPath = `tenants/${tenantId}/${path}`;
    const storageRef = ref(storage, fullPath);
    try {
      await uploadBytes(storageRef, blob);
      return fullPath;
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        const e = err as { code?: string; message?: string };
        const code = e?.code ?? '';
        const msg = e?.message ?? String(err);
        console.log('[Firebase Storage] upload error:', code, msg);
        if (code === 'storage/unauthenticated' || code === 'storage/unauthorized') {
          console.log('[Firebase Storage] Guidance: 401 / not authenticated — ensure user is signed in before upload.');
        } else if (code === 'storage/forbidden' || msg.includes('403')) {
          console.log('[Firebase Storage] Guidance: 403 — blocked by Storage Rules; check tenants/{tenantId}/** allows write when request.auth != null.');
        } else if (code === 'storage/object-not-found' || msg.includes('404')) {
          console.log('[Firebase Storage] Guidance: 404 — wrong bucket or path; compare Network tab request URL bucket to Firebase Console storageBucket.');
        }
      }
      throw err;
    }
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
