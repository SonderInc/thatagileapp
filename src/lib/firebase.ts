import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID && {
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }),
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  if (
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID &&
    import.meta.env.VITE_FIREBASE_ANALYTICS_ENABLED
  ) {
    analytics = getAnalytics(app);
  }
  if (import.meta.env.DEV) console.log('[Firebase] Connected to project:', firebaseConfig.projectId);
} else {
  if (import.meta.env.DEV) {
    console.warn(
      '[Firebase] Not configured. Create .env.local in the project root with VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc., then restart the dev server (npm run dev).'
    );
  }
}

export { db, analytics };
export const isFirebaseConfigured = (): boolean => !!db;
