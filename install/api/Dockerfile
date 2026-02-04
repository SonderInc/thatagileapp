# Minimal API for /healthz and /readyz. Cloud Run + Docker Compose (Rule 5).
FROM node:20-alpine
WORKDIR /app
# Build context is install/ (parent of api/)
COPY api/package.json api/index.js ./
EXPOSE 3000
ENV PORT=3000
CMD ["node", "index.js"]
