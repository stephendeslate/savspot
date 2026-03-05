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

# Install all dependencies (including devDependencies for the build stage)
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────
# Stage 2: Build
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy everything from deps (node_modules, lockfile, etc.)
COPY --from=deps /app ./

# Copy source files needed for the build
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY prisma/ prisma/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN pnpm --filter @savspot/prisma generate

# Build the shared package first (API depends on it)
RUN pnpm --filter @savspot/shared build

# Build the API
RUN pnpm --filter @savspot/api build

# Prune dev dependencies after build
RUN pnpm prune --prod

# ──────────────────────────────────────────────
# Stage 3: Production runner
# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy pruned node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy compiled API output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy Prisma schema + migrations (needed for migrate deploy in release_command)
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/package.json ./prisma/package.json

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3001

# Use dumb-init to handle PID 1 and signal forwarding
CMD ["dumb-init", "node", "apps/api/dist/main.js"]
