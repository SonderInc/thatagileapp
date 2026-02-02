# Deployment (Cloud SaaS & On-Prem)

This app supports **cloud SaaS** (e.g. Netlify) and **customer-hosted / on-prem** without rewrite. All configuration is env-based (12-factor).

## Required env vars (frontend)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_BASE_URL` | Base URL of the app | (empty) |
| `VITE_API_BASE_URL` | Backend API base URL (empty = same origin) | (empty) |
| `VITE_AUTH_PROVIDER` | `firebase` \| `oidc` \| `local` | `firebase` |
| `VITE_DATA_PROVIDER` | `firestore` \| `postgres` | `firestore` |
| `VITE_STORAGE_PROVIDER` | `firebase` \| `s3` | `firebase` |
| `VITE_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | `info` |
| `VITE_TENANT_ID` | Tenant id for single-tenant/on-prem | (empty) |

When using Firebase:

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Optional: `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_FIREBASE_ANALYTICS_ENABLED`
- Optional: `VITE_GA_MEASUREMENT_ID` (GA4)

See `.env.example` for a full template.

## Build & start

- **Build:** `npm run build`
- **Production serve:** `npm run start` (runs `vite preview`; default port 4173)
- **Dev:** `npm run dev` (default port 5173)

## Ports

- Dev: 5173 (Vite)
- Preview/production: 4173 (Vite preview)

## Data directory

For future backend/on-prem: use a configurable data directory (e.g. `DATA_DIR=/var/lib/app`). No hardcoded filesystem paths; temp files use OS temp directory.

## Health & operability (backend)

When a backend is added, it must expose:

- `GET /healthz` — liveness
- `GET /readyz` — dependencies check

Logs should be structured and consistent.

## Backup / restore

TBD. For Firestore, use Firebase Console backup/export. For future Postgres, use standard DB backup/restore.

## Adapter layer

- **Data:** `getDataStore()` → `IDataStore` (Firestore today; Postgres later).
- **Auth:** `getAuth()` → `IAuth` (Firebase today; OIDC/local later).
- **Storage:** `getObjectStore()` → `IObjectStore` (no-op today; Firebase Storage / S3 later).

UI must not import `firebase/*`; all access goes through these adapters.
