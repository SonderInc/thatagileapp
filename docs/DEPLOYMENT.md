# Deployment (Cloud SaaS & On-Prem)

This app supports **cloud SaaS** (e.g. Netlify) and **customer-hosted / on-prem** without rewrite. All configuration is env-based (12-factor).

## Deployment mode

Single switch for all mode-specific behavior (auth, API, email verification): **`DEPLOYMENT_MODE`**

- **Frontend**: `VITE_DEPLOYMENT_MODE=saas | onprem | airgapped` (read in `src/config.ts`)
- **Backend**: `DEPLOYMENT_MODE` (read in `src/config/server.ts`)

SaaS = hosted (e.g. Netlify); onprem = internal server; airgapped = no outbound. No UI/layout changes; behavior differences are config-driven only.

## Required env vars (frontend)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DEPLOYMENT_MODE` | `saas` \| `onprem` \| `airgapped` | `saas` |
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

### Using your own database

When self-hosting, you can point the app at your own Firebase project in two ways:

1. **Deploy-time:** Set `VITE_FIREBASE_*` to your Firebase project (from Firebase Console → Project settings → Your apps), then rebuild and deploy.
2. **In-app:** Admin → Settings → **Use my own database**, paste Project ID, API Key, Auth Domain (and optional fields), then **Save**. The app will reload and use your project. Config is stored in the browser (localStorage). To switch back to the default (ThatAgile Cloud), use **Clear and use ThatAgile Cloud** in Settings.

## Build & start

- **Build:** `npm run build`
- **Production serve:** `npm run start` (runs `vite preview`; default port 4173)
- **Dev:** `npm run dev` (default port 5173)
- **On-prem USB bundle:** `npm run bundle:onprem` → produces `dist-install/` to copy to USB; see `docs/INSTALL_ONPREM.md`

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

## Custom domain and DNS (Netlify)

To use **thatagileapp.com** (or another custom domain) with a Netlify-hosted site:

**Recommended: Netlify DNS**

1. **Add the domain in Netlify** — Site → Domain management → Add custom domain → `thatagileapp.com` (and optionally `www.thatagileapp.com`).
2. **Change nameservers at your registrar** — Where you bought the domain: set Nameservers to "Custom" and enter the two nameservers Netlify shows (e.g. `dns1.p01.nsone.net`, `dns2.p01.nsone.net`). Save; propagation can take up to 24–48 hours.
3. **Wait for DNS and HTTPS** — Netlify will verify the domain and issue an SSL certificate. No A/CNAME records to add manually when using Netlify DNS.

**Alternative: DNS at your registrar**

1. Add the domain in Netlify (same as above).
2. At the registrar, add the records Netlify shows: for the root use ALIAS/ANAME to your Netlify subdomain, or A record to Netlify's load balancer; for `www` use CNAME to your site's `*.netlify.app` domain.
3. Netlify will still issue HTTPS once the domain is verified.

No code or repo changes are required; configuration is in Netlify and at the domain registrar only.

## Firestore rules

Publish the project’s `firestore.rules` in Firebase Console → Firestore Database → Rules, then click **Publish**. Or: `firebase deploy --only firestore:rules`. After any change, redeploy so User Management and company-scoped reads work; the app relies on `companyIds`/`adminCompanyIds` and rules using `sameCompany`/`isAdminForTarget` for `users` read access. Company creation is server-only (`allow create: if false`); the `register-tenant` and `provision-company` Netlify functions create companies via the Admin SDK. Use the repo `firestore.rules` file as the single source of truth; do not deploy hand-edited rules that differ from it.

The rules cover:

- **companies**, **workItems**, **users**: authenticated read/write as documented in the file.
- **invites**: unauthenticated read by document id (token) for sign-up links; create only by the inviter (`invitedBy == request.auth.uid`); update/delete by inviter or by invitee (email match) when marking an invite used.

### Troubleshooting

- **User Management: "Permission denied" or "Could not check seat limit"** — Deploy Firestore rules (see above). Ensure your user document in `users/<uid>` has `companyIds` and (if admin) `adminCompanyIds` containing your company id. Re-login so the app can backfill, or in Firebase Console → Firestore Database → Data → **users** → your document (uid), add fields **companyIds** (array with your company id) and **adminCompanyIds** (array with your company id), then reload the app.
