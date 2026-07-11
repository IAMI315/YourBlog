FROM node:24.18-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=build-time-placeholder
ENV WEB_PROJECT_UPLOAD_SECRET=build-time-placeholder
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/apply-migrations.mjs ./scripts/apply-migrations.mjs
COPY --from=builder /app/scripts/ensure-admin-password.mjs ./scripts/ensure-admin-password.mjs
COPY --from=builder /app/src/generated ./src/generated

RUN mkdir -p /app/data/uploads /app/data/web-projects

EXPOSE 3000
CMD ["sh", "-c", "node scripts/apply-migrations.mjs && node scripts/ensure-admin-password.mjs && node server.js"]
