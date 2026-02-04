# Netlify environment variables

Set these in Netlify: **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**). Redeploy after changing.

## Required for `firebase-config` function (default tenant fallback)

The `/.netlify/functions/firebase-config` function returns a full Firebase web config. When no tenant slug is provided or the tenant is not in the registry, it uses these **server-side** env vars (not `VITE_*`). Set them for **Production** (and any deploy context that runs the function).

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | Yes | Default Firebase project ID (e.g. `thatagileapp`) |
| `FIREBASE_API_KEY` | Yes | Default Firebase web API key (e.g. `AIzaSy...`) |
| `FIREBASE_AUTH_DOMAIN` | No | Default `{projectId}.firebaseapp.com` if unset |
| `FIREBASE_STORAGE_BUCKET` | No | Default `{projectId}.appspot.com` if unset |
| `FIREBASE_MESSAGING_SENDER_ID` | No | From Firebase SDK snippet |
| `FIREBASE_APP_ID` | No | From Firebase SDK snippet |
| `FIREBASE_MEASUREMENT_ID` | No | Analytics measurement ID |

If `FIREBASE_PROJECT_ID` or `FIREBASE_API_KEY` are missing when the default path is used, the function returns **HTTP 500** with `{ "error": "Default Firebase config incomplete", "missingKeys": ["..."] }`. The frontend can then fall back to its own config (e.g. from `VITE_*` build-time env).

You also need `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON key for the **registry** Firebase project) if you use tenant-specific configs via the `tenantFirebaseConfigs` Firestore collection. See `docs/TENANT_FIREBASE_CONFIG_REGISTRY.md`.

## Required for `provision-company` function (server-side company creation)

The `/.netlify/functions/provision-company` function creates a company and sets the signed-in user as admin (Firebase Admin SDK). Set these **server-side** env vars for the function.

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes (preferred) | Full JSON string of the Firebase service account key (same as upload-logo / firebase-config). |
| `FIREBASE_PROJECT_ID` | If not using JSON | Firebase project ID (alternative to full JSON). |
| `FIREBASE_CLIENT_EMAIL` | If not using JSON | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | If not using JSON | Service account private key; restore literal `\n` for newlines when pasting. |

**Optional:** `FIREBASE_STORAGE_BUCKET`, `FIREBASE_DATABASE_URL` if needed by other functions or admin usage.

## Required for Firebase (auth + Firestore + Storage) — build-time / client

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | From Firebase Console → Project settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `thatagileapp` |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Must match Firebase Console** (Storage bucket) | `thatagileapp.firebasestorage.app` or `thatagileapp.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | From SDK snippet |
| `VITE_FIREBASE_APP_ID` | App ID | From SDK snippet |

Get the exact `storageBucket` from Firebase Console → **Project settings** → **General** → **Your apps** → Firebase SDK snippet, or **Storage** → bucket name. If this does not match, uploads can fail with 404 or CORS-like errors.

## Optional

| Variable | Description |
|----------|-------------|
| `VITE_APP_BASE_URL` | Public URL of the site (e.g. `https://thatagileapp.netlify.app`) |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID |
| `VITE_FIREBASE_ANALYTICS_ENABLED` | Set to enable Analytics |
| `VITE_USE_UPLOAD_PROXY` | Set to `true` to use Netlify Function for logo upload (avoids direct Storage CORS). Then set function env: `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_STORAGE_BUCKET`. |

## Scopes

Apply variables to **Production** (and **Branch deploys** if you use them). Variables are available at build time; `VITE_*` are inlined into the client bundle.

## Verification checklist (provision-company)

After deploying server-side company provisioning:

1. Log in as a brand-new user (no existing company).
2. Click **Create company** and submit valid name, slug, and company type.
3. Confirm in Firestore: `users/{uid}` has `companyId`, `companyIds`, `adminCompanyIds`, `companies` set to the new company only.
4. Confirm: `companies/{companyId}` exists with the correct `slug`.
5. Confirm the app redirects to `/{slug}` and the admin menu appears.
6. Confirm no seed tenant (e.g. `seed-tenant-1`) appears anywhere for that user.
