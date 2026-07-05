# ────────────────────────────────────────────────────────────────────────────
# Aegis Attendance — Dockerfile
#
# Single-service deployment strategy:
#   • Express serves the frontend static files from /public
#   • Backend API runs on the same port
#   • DATABASE_URL and GROQ_API_KEY come from the host environment (Render/Railway)
#
# Build:  docker build -t aegis-attendance .
# Run:    docker run -p 4000:4000 --env-file backend/.env aegis-attendance
# ────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install production dependencies ─────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app/backend

# Copy only the manifest first — leverages Docker layer cache
COPY backend/package*.json ./

RUN npm ci --omit=dev


# ── Stage 2: generate Prisma client ──────────────────────────────────────
FROM node:20-alpine AS prisma-generate

WORKDIR /app/backend

COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/prisma ./prisma

RUN npx prisma generate


# ── Stage 3: final runtime image ─────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy backend
COPY --from=prisma-generate /app/backend/node_modules ./backend/node_modules
COPY backend ./backend

# Copy frontend static files into backend/public so Express can serve them
COPY index.html    ./backend/public/index.html
COPY styles.css    ./backend/public/styles.css
COPY app.js        ./backend/public/app.js
COPY api.js        ./backend/public/api.js
COPY mockData.js   ./backend/public/mockData.js

RUN chown -R appuser:appgroup /app
USER appuser

WORKDIR /app/backend

EXPOSE 4000

# Health check — Render/Railway will use this to confirm the service is up
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/index.js"]
