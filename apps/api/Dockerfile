# ──────────────────────────────────────────────
# Stage 1: Install dependencies
# ──────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config files first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json for each workspace the API depends on
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY prisma/package.json prisma/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# ──────────────────────────────────────────────
# Stage 2: Build (includes devDependencies)
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY prisma/package.json prisma/

# Install ALL dependencies (dev + prod) for building
RUN pnpm install --frozen-lockfile

# Copy source files needed for the build
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY prisma/ prisma/
COPY apps/api/ apps/api/

# Generate Prisma client (output: prisma/generated/prisma/)
RUN pnpm --filter @savspot/prisma generate

# Build the shared package first (API depends on it)
RUN pnpm --filter @savspot/shared build

# Build the API (increase heap for TypeScript compilation)
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter @savspot/api build

# ──────────────────────────────────────────────
# Stage 3: Production runner
# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy production-only node_modules from deps stage (no devDependencies)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy built shared package (including its node_modules for runtime deps like zod)
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy compiled API output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy Prisma schema + migrations (needed for migrate deploy in release_command)
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/package.json ./prisma/package.json

# Copy prisma workspace node_modules (contains prisma CLI symlinks into root .pnpm store)
COPY --from=deps /app/prisma/node_modules ./prisma/node_modules

# Copy generated Prisma client (custom output path)
COPY --from=builder /app/prisma/generated ./prisma/generated

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Fix permissions for Prisma engines (needed for migrate deploy release command)
RUN chown -R nestjs:nodejs /app/node_modules/.pnpm/@prisma+engines*/node_modules/@prisma/engines || true

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init to handle PID 1 and signal forwarding
CMD ["dumb-init", "node", "apps/api/dist/main.js"]
