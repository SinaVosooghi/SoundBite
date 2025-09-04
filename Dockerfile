# Multi-stage Dockerfile for NestJS/Node.js app - OPTIMIZED FOR SPEED
# syntax=docker/dockerfile:1.4

# Use a smaller base image for faster downloads
FROM node:22-alpine AS base
RUN apk add --no-cache curl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install Yarn 4 (Berry) - cache this layer
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copy only package files first for better caching
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies with aggressive caching and optimization
RUN --mount=type=cache,target=/root/.yarn/cache \
    --mount=type=cache,target=/root/.npm \
    yarn install --immutable --network-timeout 600000

# Builder stage
FROM base AS builder
WORKDIR /app

# Install Yarn 4
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy source code (only what's needed for build)
COPY src/ ./src/
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Build the application
RUN yarn build

# Production image - minimal and fast
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only production files and set ownership in one step
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
