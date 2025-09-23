# Production Dockerfile for CHRONOS Backend

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install security updates and necessary packages
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY backend/package.json backend/package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --only=production && npm cache clean --force; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Build dependencies for compilation
FROM base AS build-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=build-deps /app/node_modules ./node_modules
COPY backend/ ./
COPY prisma/ ./prisma/

# Build arguments for Prisma
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Prune node_modules for production
RUN npm prune --production && npm cache clean --force

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install runtime dependencies for security
RUN apk add --no-cache \
    curl \
    ca-certificates \
    && apk upgrade \
    && rm -rf /var/cache/apk/*

# Create non-root user with proper permissions
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 chronos --ingroup nodejs

# Copy the built application
COPY --from=builder --chown=chronos:nodejs /app/dist ./dist
COPY --from=builder --chown=chronos:nodejs /app/prisma ./prisma
COPY --from=deps --chown=chronos:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=chronos:nodejs /app/package.json ./package.json

# Create logs directory
RUN mkdir -p /app/logs && chown -R chronos:nodejs /app/logs

USER chronos

EXPOSE 3001

# Enhanced health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Use exec form for proper signal handling
CMD ["node", "dist/index.js"]