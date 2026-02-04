# Minimal API (Rule 5)

Exposes **/healthz** and **/readyz** for hybrid architecture (Cloud Run + Docker Compose). No DB or secrets; extend readyz when backend adds dependencies.

- **Run locally:** `node index.js` (PORT=3000)
- **Run in Docker:** from repo root, `cd install && docker compose up --build` then `curl http://localhost:8080/api/healthz` and `curl http://localhost:8080/api/readyz`
- **Cloud Run:** build image from this directory (context = parent, dockerfile = api/Dockerfile); set PORT env
