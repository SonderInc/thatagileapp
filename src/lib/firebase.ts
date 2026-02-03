import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getFirebaseConfig } from './firebaseConfig';

const firebaseConfig = getFirebaseConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

if (firebaseConfig?.projectId && firebaseConfig?.apiKey) {
  const resolvedBucket =
    firebaseConfig.storageBucket || `${firebaseConfig.projectId}.appspot.com`;
  const configWithBucket = { ...firebaseConfig, storageBucket: resolvedBucket };
  app = initializeApp(configWithBucket);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  if (firebaseConfig.measurementId && import.meta.env.VITE_FIREBASE_ANALYTICS_ENABLED) {
    analytics = getAnalytics(app);
  }
  if (import.meta.env.DEV) {
    console.log('[Firebase] Connected to project:', firebaseConfig.projectId);
    console.log('[Firebase] Storage bucket:', resolvedBucket);
    if (!resolvedBucket) {
      console.warn(
        '[Firebase] Storage bucket missing; set VITE_FIREBASE_STORAGE_BUCKET to match Firebase Console (Project settings → General → Your apps).'
      );
    } else if (
      firebaseConfig.projectId &&
      !resolvedBucket.includes(firebaseConfig.projectId)
    ) {
      console.warn(
        '[Firebase] Storage bucket may be inconsistent with projectId:',
        resolvedBucket,
        'vs project',
        firebaseConfig.projectId,
        '— ensure VITE_FIREBASE_STORAGE_BUCKET matches Firebase Console.'
      );
    }
  }
} else {
  if (import.meta.env.DEV) {
    console.warn(
      '[Firebase] Not configured. Create .env.local with VITE_FIREBASE_* or use Settings to paste your Firebase config, then reload.'
    );
  }
}

export { db, auth, storage, analytics };
export const isFirebaseConfigured = (): boolean => !!db;
