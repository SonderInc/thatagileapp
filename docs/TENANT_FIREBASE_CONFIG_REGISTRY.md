# Tenant Firebase config registry (Phase 2)

When using **one Firebase project per company**, the app resolves which Firebase project to use from the **path slug** (e.g. `/compassion-course` → slug `compassion-course`). It calls the Netlify function `firebase-config` with that slug; the function reads the registry and returns either the tenant’s Firebase client config or the **default** Firebase config (from Netlify env vars). The response is always a full config object (no `useDefault` flag).

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
- **Query:** `?slug=...` or `?companyId=...` (no slug = default tenant).
- **Response:** Always a full Firebase web config: `{ projectId, apiKey, authDomain, storageBucket, messagingSenderId?, appId?, measurementId? }`. For unknown/missing tenant, the function returns the **default** config from env vars (same shape). HTTP 500 if required default env vars are missing.
- **Env (registry):** `FIREBASE_SERVICE_ACCOUNT_JSON` for the **registry** project so it can read `tenantFirebaseConfigs`.
- **Env (default config):** For default-tenant fallback, set: `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` (required); optionally `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`. See `docs/NETLIFY_ENV.md`.

### Expected curl output (default tenant)

With no slug or unknown slug, the function returns full config from env, e.g.:

```bash
curl -s "https://your-site.netlify.app/.netlify/functions/firebase-config"
curl -s "https://your-site.netlify.app/.netlify/functions/firebase-config?slug=unknown-tenant"
```

Expected (example):

```json
{
  "projectId": "thatagileapp",
  "apiKey": "AIzaSy...",
  "authDomain": "thatagileapp.firebaseapp.com",
  "storageBucket": "thatagileapp.appspot.com",
  "messagingSenderId": "...",
  "appId": "...",
  "measurementId": "..."
}
```

If `FIREBASE_PROJECT_ID` or `FIREBASE_API_KEY` are missing, response is HTTP 500 with `{ "error": "Default Firebase config incomplete", "missingKeys": ["FIREBASE_PROJECT_ID", ...] }`.
