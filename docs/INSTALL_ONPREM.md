# On-Prem & Air-Gapped Install

This project supports **online SaaS** (Netlify/cloud) and **on-prem / air-gapped** from the same codebase. Behavior differences are controlled by `DEPLOYMENT_MODE` and provider env vars only; no UI/layout changes.

## Prerequisites

- **Target machine**: Docker and Docker Compose (`docker compose` or `docker-compose`)
- **Build machine** (to create the bundle): Node 18+, npm

## Creating the USB install bundle

On a machine with network (or your CI):

```bash
npm run build          # optional: normal build
npm run bundle:onprem  # builds frontend with VITE_DEPLOYMENT_MODE=onprem and produces dist-install/
```

This:

1. Builds the frontend (production) with on-prem defaults
2. Creates `dist-install/` containing:
   - `docker-compose.yml` — proxy (nginx) + api placeholder
   - `.env.onprem.example` — customer copies to `.env` and edits
   - `install.sh` — offline-first installer
   - `load-images.sh` — load Docker images from tar (air-gapped)
   - `README_INSTALL.md` — step-by-step for end users
   - `app/` — pre-built frontend assets
   - `images/` — optional dir for pre-saved image tars
   - `api/`, `migrations/`, `licenses/` — reserved

3. Copy `dist-install/` to a USB drive (or transfer to target). No internet required on target if images are pre-loaded.

## Install on target (internal network)

1. Copy `dist-install/` from USB to the target machine.
2. `cd dist-install`
3. (Optional) Copy `.env.onprem.example` to `.env` and edit:
   - `DEPLOYMENT_MODE=onprem` (or `airgapped` for no outbound)
   - `APP_PORT`, `VITE_APP_BASE_URL`, `VITE_TENANT_ID`
   - Provider vars: `VITE_AUTH_PROVIDER`, `VITE_DATA_PROVIDER`, `VITE_STORAGE_PROVIDER`
4. If you have image tars in `images/`: `./load-images.sh`
5. `./install.sh` — creates `.env` from example if missing, validates, runs `docker compose up -d`
6. Open the printed URL (e.g. `http://localhost:8080`).

## Install on target (air-gapped)

- Set `DEPLOYMENT_MODE=airgapped` in `.env`.
- Do **not** rely on Firebase or any external service unless you have a local mirror.
- Pre-load all images on a connected machine, then copy `dist-install/` (including `images/*.tar`) to USB:
  ```bash
  docker save -o dist-install/images/nginx.tar nginx:alpine
  docker save -o dist-install/images/busybox.tar busybox:1.36
  ```
- On the air-gapped target: run `./load-images.sh` then `./install.sh`.
- Phase 1 on-prem can still use Firebase if the network allows; for strict air-gap, use local auth/postgres/minio when those providers are implemented.

## .env for on-prem vs air-gapped

| Setting | On-prem (internal network) | Air-gapped |
|--------|----------------------------|------------|
| `DEPLOYMENT_MODE` | `onprem` | `airgapped` |
| `VITE_APP_BASE_URL` | e.g. `http://internal-host:8080` | e.g. `http://localhost:8080` |
| `VITE_AUTH_PROVIDER` | `firebase` (if allowed) or `local` (when available) | `local` (when available) |
| `VITE_DATA_PROVIDER` | `firestore` or `postgres` | `postgres` (when available) |
| `VITE_STORAGE_PROVIDER` | `firebase` or `s3` | `s3` (e.g. MinIO) when available |

## Upgrade

- Replace `app/` in `dist-install/` with a new frontend build (or re-run `npm run bundle:onprem` and replace the whole folder).
- Replace `images/*.tar` if image versions changed.
- On target: `./load-images.sh` (if needed), then `docker compose pull && docker compose up -d` (or re-run `install.sh`).

## Backup & restore

- **Database**: When Postgres is used, back up the `postgres_data` volume (or your DB export). Restore to same or new volume and point `DATA_PROVIDER` to it.
- **Uploads**: When MinIO/S3 is used, back up the storage volume or bucket; restore and point `STORAGE_PROVIDER` to it.
- **Config**: Keep a copy of `.env` and any custom `nginx.conf`.

## Deployment mode (no UI change)

All mode-specific behavior is driven by config:

- **DEPLOYMENT_MODE**: `saas` | `onprem` | `airgapped` — read in `src/config.ts` (frontend) and `src/config/server.ts` (backend).
- **Email verification**: Required in `saas`; optional/offline in `onprem` / `airgapped` via `config.EMAIL_VERIFICATION_REQUIRED`.
- **Auth/API/endpoints**: Chosen via `AUTH_PROVIDER`, `API_BASE_URL`, and provider env vars; no hardcoded URLs.

SaaS mode and behavior remain unchanged; on-prem is additive packaging and config.
