# Tenant Firebase config registry (Phase 2)

When using **one Firebase project per company**, the app resolves which Firebase project to use from the **path slug** (e.g. `/compassion-course` → slug `compassion-course`). It calls the Netlify function `firebase-config` with that slug; the function reads the registry and returns either the tenant’s Firebase client config or `{ useDefault: true }`.

## Firestore collection: `tenantFirebaseConfigs`

- **Document ID:** company slug (e.g. `compassion-course`). Must match the slug used in the app URL.
- **Fields (all strings except where noted):**
  - `projectId` (required)
  - `apiKey` (required)
  - `authDomain` (optional; default `{projectId}.firebaseapp.com`)
  - `storageBucket` (optional; default `{projectId}.appspot.com`)
  - `messagingSenderId` (optional)
  - `appId` (optional)
  - `measurementId` (optional)

Client read/write is disabled in Firestore rules; only the Netlify function (using the Firebase Admin SDK with the **registry project’s** service account) should read this collection. Writes are done by your provisioning process (e.g. script or backend that creates a new Firebase project and then adds a document here).

## When to add a document

When you provision a **new** Firebase project for a company (e.g. via Firebase Management API or Terraform), after creating the project and adding a web app:

1. Get the web app’s config (projectId, apiKey, authDomain, etc.) from the Firebase Console or API.
2. In the **registry** Firestore (the main/shared project that holds this collection), create a document in `tenantFirebaseConfigs` with ID = company slug and the config fields above.

The app will then use that config when users visit `/{slug}/...` (bootstrap fetches config by slug and initializes Firebase with it).

## Netlify function

- **Name:** `firebase-config`
- **Path:** `netlify/functions/firebase-config.ts`
- **Query:** `?slug=...` or `?companyId=...`
- **Response:** `{ useDefault: true }` or `{ projectId, apiKey, authDomain, ... }`
- **Env:** Same as other serverless functions; needs `FIREBASE_SERVICE_ACCOUNT_JSON` for the **registry** project so it can read `tenantFirebaseConfigs`.
