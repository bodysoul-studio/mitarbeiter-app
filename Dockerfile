FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Create a template database with all migrations applied
RUN npx prisma migrate deploy

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma/dev.db ./prisma/template.db

# Create directories for persistent data
RUN mkdir -p /data /app/public/uploads
RUN chown -R nextjs:nodejs /data /app/public/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/data/prod.db"

# At startup: if no DB exists, copy template; then start server
CMD ["sh", "-c", "if [ ! -f /data/prod.db ]; then cp /app/prisma/template.db /data/prod.db; echo 'Database initialized'; fi && node server.js"]
