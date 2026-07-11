FROM node:24.18-bookworm-slim AS build-base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM build-base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM node:24.18-bookworm-slim AS node-runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends binutils && strip --strip-unneeded /usr/local/bin/node && rm -rf /var/lib/apt/lists/*

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=build-time-placeholder
ENV WEB_PROJECT_UPLOAD_SECRET=build-time-placeholder
RUN pnpm build
RUN mkdir -p /app/data/uploads /app/data/web-projects

FROM gcr.io/distroless/base-debian12:nonroot AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV LD_LIBRARY_PATH=/app/node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.2/node_modules/@img/sharp-libvips-linux-x64/lib
WORKDIR /app

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /lib/x86_64-linux-gnu/libstdc++.so.6 /lib/x86_64-linux-gnu/libstdc++.so.6
COPY --from=node-runtime /lib/x86_64-linux-gnu/libgcc_s.so.1 /lib/x86_64-linux-gnu/libgcc_s.so.1
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.2 ./node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.2
COPY --from=builder --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=builder --chown=65532:65532 /app/public ./public
COPY --from=builder --chown=65532:65532 /app/prisma ./prisma
COPY --from=builder --chown=65532:65532 /app/scripts/apply-migrations.mjs ./scripts/apply-migrations.mjs
COPY --from=builder --chown=65532:65532 /app/scripts/ensure-admin-password.mjs ./scripts/ensure-admin-password.mjs
COPY --from=builder --chown=65532:65532 /app/scripts/start-production.mjs ./scripts/start-production.mjs
COPY --from=builder --chown=65532:65532 /app/src/generated ./src/generated
COPY --from=builder --chown=65532:65532 /app/data ./data

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/node"]
CMD ["scripts/start-production.mjs"]
