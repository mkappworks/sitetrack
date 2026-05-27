# ── Stage 1: Install dependencies ─────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Copy only package files first — layer cache means this only
# re-runs when dependencies actually change, not on every code change
COPY package*.json ./
RUN npm ci --only=production && npm ci

# ── Stage 2: Build TypeScript ──────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: Minimal production image ─────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

# Copy only what's needed to run
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nestjs

EXPOSE 3001

# Explicit start command — never use `npm start` in production
# (it adds an extra process layer and masks signals)
CMD ["node", "dist/main"]
