# On-Prem / USB Install Bundle

This folder is the **offline install bundle**. Copy the whole `dist-install/` directory to a USB drive and run on a target machine with Docker. No internet required if images are pre-loaded.

## Prerequisites

- Docker installed
- Docker Compose available (`docker compose` or `docker-compose`)
- (Optional) For air-gapped: pre-built image tars in `images/` (see below)

## Steps

1. **Copy to target**  
   Copy `dist-install/` to the target machine (e.g. from USB).

2. **Edit env**  
   - If `.env` is missing, it is created from `.env.onprem.example` when you run `install.sh`.  
   - Edit `.env`: set `APP_PORT`, `VITE_APP_BASE_URL`, `VITE_TENANT_ID`, and provider vars as needed.  
   - For **air-gapped**: set `DEPLOYMENT_MODE=airgapped` and use only local auth/storage when implemented.

3. **Load images (air-gapped only)**  
   If you have pre-built image tars in `images/`:
   ```bash
   chmod +x load-images.sh
   ./load-images.sh
   ```

4. **Install**  
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

5. **Open app**  
   Visit the URL printed (e.g. `http://localhost:8080`).

## Building image tars (on a machine with network)

From the project repo after `npm run bundle:onprem`:

```bash
# Example: save proxy and api images for offline load
docker save -o dist-install/images/nginx.tar nginx:alpine
docker save -o dist-install/images/api.tar busybox:1.36
# Then copy dist-install/ to USB.
```

## Folders in this bundle

| Folder     | Contents                          |
|-----------|------------------------------------|
| `app/`    | Pre-built frontend (static assets) |
| `api/`    | (Reserved for API image or config)|
| `images/` | Optional `.tar` Docker images      |
| `migrations/` | (Reserved for DB migrations)   |
| `licenses/`   | (Reserved for license files)   |

## Upgrade

- Replace `app/` with new frontend build.  
- Replace image tars in `images/` if needed.  
- Run `./load-images.sh` then `docker compose up -d` (or re-run `install.sh`).

## Backup / restore

- **App state**: Backend and DB not yet implemented; when added, back up the DB volume and any uploads (e.g. MinIO data).  
- **Config**: Keep a copy of `.env` and any custom `nginx.conf`.
