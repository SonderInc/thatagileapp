/**
 * Adapter factories — single doorway for data, auth, storage.
 * Config-driven; swap providers via env (firestore/postgres, firebase/oidc, firebase/s3).
 */
import { config } from '../config';
import type { IDataStore } from '../data/IDataStore';
import type { IAuth } from '../auth/IAuth';
import type { IObjectStore } from '../storage/IObjectStore';
import { FirestoreStore } from '../data/FirestoreStore';
import { FirebaseAuthAdapter } from '../auth/FirebaseAuthAdapter';
import { NoOpObjectStore } from '../storage/NoOpObjectStore';
import { FirebaseStorageObjectStore } from '../storage/FirebaseStorageObjectStore';
import { ProxyObjectStore } from '../storage/ProxyObjectStore';
import { isFirebaseConfigured } from './firebase';

let dataStoreInstance: IDataStore | null = null;
let authInstance: IAuth | null = null;
let objectStoreInstance: IObjectStore | null = null;

export function getDataStore(): IDataStore {
  if (!dataStoreInstance) {
    if (config.DATA_PROVIDER === 'firestore') {
      dataStoreInstance = FirestoreStore;
    } else {
      throw new Error(`Unsupported DATA_PROVIDER: ${config.DATA_PROVIDER}`);
    }
  }
  return dataStoreInstance;
}

export function getAuth(): IAuth {
  if (!authInstance) {
    if (config.AUTH_PROVIDER === 'firebase') {
      authInstance = FirebaseAuthAdapter;
    } else {
      throw new Error(`Unsupported AUTH_PROVIDER: ${config.AUTH_PROVIDER}`);
    }
  }
  return authInstance;
}

export function getObjectStore(): IObjectStore {
  if (!objectStoreInstance) {
    if (config.STORAGE_PROVIDER === 'firebase' && config.USE_UPLOAD_PROXY) {
      objectStoreInstance = ProxyObjectStore;
    } else if (config.STORAGE_PROVIDER === 'firebase' && isFirebaseConfigured()) {
      objectStoreInstance = FirebaseStorageObjectStore;
    } else {
      objectStoreInstance = NoOpObjectStore;
    }
  }
  return objectStoreInstance;
}
