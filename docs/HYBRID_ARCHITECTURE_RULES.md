# Hybrid Architecture Rules (Minimize Rework)

Evolve the product to support **SaaS shared** (tenant isolation via RLS), **enterprise dedicated DB per tenant**, and **on-prem single-tenant** without rewriting UI/business logic.

---

## Hard rules

| # | Rule | Summary |
|---|------|--------|
| 1 | No tenant security in frontend | Frontend may derive **slug for routing only**. No decisions that grant or deny data access. |
| 2 | Data behind provider/API | All data access via **IDataStore / IObjectStore / IAuth** and/or API layer. |
| 3 | Config-only mode/provider | **DEPLOYMENT_MODE=saas\|onprem** and **DATA_PROVIDER=firestore\|postgres** via config modules only. |
| 4 | Tenant ID + RLS-ready | New tables/records must include **tenant_id**; design compatible with Postgres RLS. |
| 5 | Backend health + runnable | Backend exposes **/healthz** and **/readyz**; runnable in **Cloud Run** and **Docker Compose**. |
| 6 | Secrets never to client | DB credentials never sent to client. Use Secret Manager (cloud), env secrets (on-prem). |
| 7 | Provisioning automated | Server-side: **create tenant**, **assign isolation_mode** (shared_rls \| dedicated_db), **run migrations**. |
| 8 | Auth adapter for OIDC | Keep Firebase Auth initially; **IAuth** designed for future OIDC support. |
| 9 | Bootstrap no-store + stamping | Netlify function responses for bootstrap/config **no-store** and **build-stamping headers** for deploy verification. |
| 10 | Change log | Every change: **list files changed** and **confirm no UI/UX change** unless explicitly requested. |

---

## Current state vs rules

| Rule | Status | Notes |
|------|--------|--------|
| 1 | ✅ Partial | Slug from path for routing only. Tenant list/access today enforced by Firestore rules (server-side). Frontend does not make security grants; for full compliance, tenant list could come from API. |
| 2 | ✅ | All data via getDataStore()/getAuth()/getObjectStore(). Firestore is one implementation; future Postgres via API-backed implementation. |
| 3 | ✅ | `src/config.ts` and `src/config/server.ts`: DEPLOYMENT_MODE, DATA_PROVIDER (and AUTH_PROVIDER, STORAGE_PROVIDER). |
| 4 | ✅ | WorkItem/companies use **companyId** (tenant). New schema must use tenant_id; map companyId ↔ tenant_id for RLS. |
| 5 | ✅ Added | Minimal API in `install/api/`: GET /healthz, GET /readyz; Dockerfile; runnable in Docker Compose and Cloud Run. |
| 6 | ✅ | Firebase client config (VITE_FIREBASE_*) is public by design. DB credentials (future Postgres) only in backend env / Secret Manager. |
| 7 | 📋 Planned | No automation yet. Provisioning endpoints/scripts: create tenant, isolation_mode, migrations—to be added. |
| 8 | ✅ | IAuth abstraction; only Firebase implemented. OIDC adapter can implement same interface. |
| 9 | ✅ | firebase-config function: Cache-Control: no-store, x-firebase-config-version header. |
| 10 | Process | Follow on every change. |

---

## Task list and deliverables

### Task 1: No tenant security in frontend (verify only)

- **Goal:** Ensure no security decisions (who can see what) are made in the frontend.
- **Files to review:** `src/App.tsx`, `src/store/useStore.ts`, any component that filters by tenant.
- **Deliverables:**
  - **Files changed:** None (verification only). Optional: move “my tenants” to API later.
  - **Why hybrid:** In dedicated-DB or RLS mode, only the backend/API should decide tenant set; frontend just displays and routes by slug.
  - **Verify:** Grep for companyId/tenant filtering in UI; confirm it only affects display/routing, not “allow/deny” logic.

---

### Task 2: Data behind provider/API (current + future)

- **Goal:** All data access via IDataStore/IAuth/IObjectStore or API.
- **Files:** `src/lib/adapters.ts`, `src/data/*`, `src/auth/*`, `src/storage/*`, `src/api/client.ts`.
- **Deliverables:**
  - **Files changed:** None for current state. Future: add BackendApiDataStore that calls API (when backend implements data routes).
  - **Why hybrid:** Shared RLS = backend queries with RLS; dedicated DB = backend chooses DB per tenant; on-prem = same API, different env. UI unchanged.
  - **Verify:** No direct firebase/firestore imports in components, hooks, or store; only in adapters and lib/firestore.

---

### Task 3: DEPLOYMENT_MODE and DATA_PROVIDER in config

- **Goal:** Single source of truth for mode and provider.
- **Files:** `src/config.ts`, `src/config/server.ts`, `.env.example`.
- **Deliverables:**
  - **Files changed:** Already done. Document in this file.
  - **Why hybrid:** SaaS vs on-prem vs airgapped and firestore vs postgres selected by config; no UI branches.
  - **Verify:** Search for DEPLOYMENT_MODE, DATA_PROVIDER; used in config only; .env.example documents both.

---

### Task 4: New tables/records include tenant_id (RLS-ready)

- **Goal:** Any new persistence has tenant_id; Postgres RLS compatible.
- **Files:** New migrations, new store methods, firestore.rules.
- **Deliverables:**
  - **Files changed:** When adding tables/collections: add tenant_id (or companyId) and document RLS policy.
  - **Why hybrid:** Shared mode = RLS on tenant_id; dedicated = one DB per tenant; same schema.
  - **Verify:** New schema has tenant identifier; RLS policy doc or migration comments.

---

### Task 5: Backend /healthz and /readyz (Cloud Run + Docker)

- **Goal:** Backend exposes health/ready; runnable in Cloud Run and Docker Compose.
- **Files changed:** `install/api/index.js`, `install/api/package.json`, `install/api/Dockerfile`, `install/api/README.md`, `install/docker-compose.yml`. (No change to `scripts/bundle-onprem.sh`; it already copies `install/api/*` to `dist-install/api/`.)
- **Why hybrid:** Same backend image for Cloud Run (SaaS) and Docker Compose (on-prem); health checks for orchestration.
- **Verify locally:** API only: `cd install/api && node index.js` then `curl http://localhost:3000/healthz` and `curl http://localhost:3000/readyz`. Full stack (proxy + api + app): `npm run bundle:onprem` then `cd dist-install && docker compose up --build`; then `curl http://localhost:8080/api/healthz` and `curl http://localhost:8080/api/readyz`.
- **Verify deploy:** Cloud Run: build image with context = install, dockerfile = api/Dockerfile; set PORT; GET /healthz and /readyz return 200. Docker Compose: same in dist-install as above.

---

### Task 6: Secrets never to client

- **Goal:** DB credentials and API secrets only server-side (env or Secret Manager).
- **Files:** Backend env docs, any new backend code.
- **Deliverables:**
  - **Files changed:** Documentation only unless new backend reads DB (then use env/Secret Manager).
  - **Why hybrid:** Cloud = Secret Manager; on-prem = env file; frontend never sees DB credentials.
  - **Verify:** No DB_URL/POSTGRES_* in VITE_* or client bundle; backend reads from process.env or Secret Manager.

---

### Task 7: Provisioning automated (create tenant, isolation_mode, migrations)

- **Goal:** Server-side create tenant, assign isolation_mode (shared_rls | dedicated_db), run migrations.
- **Files to add:** API routes or scripts (e.g. POST /api/admin/tenants, migration runner); registry/store for tenant + isolation_mode.
- **Deliverables:**
  - **Files changed:** TBD when implemented (e.g. server routes, migrations, docs).
  - **Why hybrid:** SaaS = create tenant in shared DB + RLS; enterprise = create tenant + dedicated DB; on-prem = single tenant; all via same provisioning contract.
  - **Verify:** Call create-tenant endpoint; run migrations; confirm tenant record has isolation_mode.

---

### Task 8: Auth adapter for OIDC

- **Goal:** Keep Firebase; IAuth supports future OIDC.
- **Files:** `src/auth/IAuth.ts`, `src/auth/FirebaseAuthAdapter.ts`; future `OIDCAuthAdapter.ts`.
- **Deliverables:**
  - **Files changed:** None. IAuth is the contract; OIDC adapter will implement it.
  - **Why hybrid:** SaaS can stay Firebase; enterprise/on-prem may use OIDC; UI unchanged.
  - **Verify:** IAuth interface covers sign-in, sign-out, onAuthStateChanged, user identity; no Firebase types in interface.

---

### Task 9: Netlify bootstrap no-store + build stamping

- **Goal:** firebase-config (and any config) responses no-store and version header.
- **Files:** `netlify/functions/firebase-config.js` (and .ts).
- **Deliverables:**
  - **Files changed:** Already done (Cache-Control: no-store, x-firebase-config-version).
  - **Why hybrid:** Ensures deploy verification; no stale config for multi-tenant or on-prem.
  - **Verify:** `curl -i .../.netlify/functions/firebase-config` shows cache-control: no-store and x-firebase-config-version.

---

### Task 10: Change process (list files, no UI change)

- **Goal:** Every change lists files and confirms no UI/UX change unless requested.
- **Deliverables:** Per-PR or per-change: files changed list; statement that UI/UX unchanged (or what changed and why).
- **Verify:** Review checklist in PR or commit message.

---

## Files to review (hybrid roadmap)

- **Config:** `src/config.ts`, `src/config/server.ts`, `.env.example`
- **Adapters:** `src/lib/adapters.ts`, `src/data/IDataStore.ts`, `src/auth/IAuth.ts`, `src/storage/IObjectStore.ts`
- **Tenant routing (slug only):** `src/lib/firebaseBootstrap.ts`, `src/App.tsx`
- **Backend health:** `install/api/` (server, Dockerfile), `install/docker-compose.yml`, `install/nginx.conf`
- **Bootstrap/config:** `netlify/functions/firebase-config.js`, `docs/TENANT_FIREBASE_CONFIG_REGISTRY.md`
- **Security/enforcement:** `firestore.rules`, `storage.rules`; future Postgres RLS
- **Provisioning:** TBD (server routes or scripts); `docs/TENANT_FIREBASE_CONFIG_REGISTRY.md` (tenant registry today)

---

## Definition of done (per change)

- List files modified and which rule(s) they support.
- Confirm no UI/UX or behavior change unless explicitly requested.
- How to verify locally and in deploy (brief steps).
