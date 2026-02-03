# Netlify environment variables

Set these in Netlify: **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**). Redeploy after changing.

## Required for Firebase (auth + Firestore + Storage)

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
