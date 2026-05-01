# ─── Stage 1: Prune ──────────────────────────────────────────────────────────
FROM node:20-slim AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @klariq/api --docker

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install system dependencies (needed for some node modules)
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy pruned locks and package.json
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json

# Install dependencies
RUN npm install

# Generate Prisma Client (Crucial for monorepo types)
RUN npx turbo run db:generate

# Copy source code and build
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=@klariq/api...

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Add a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy essential files
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/node_modules ./node_modules

# Copy built applications and packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Start the application
CMD ["node", "apps/api/dist/src/main"]
