import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

async function file(path: string): Promise<string> {
  return readFile(resolve(ROOT, path), "utf8");
}

describe("production proxy and compose configuration", () => {
  it("copies runtime files required by Prisma and native dependencies", async () => {
    const dockerfile = await file("Dockerfile");
    const nextConfig = await file("next.config.ts");
    const packageJson = JSON.parse(await file("package.json"));

    expect(dockerfile).toContain("FROM node:24.18-bookworm-slim AS node-runtime");
    expect(dockerfile).toContain("strip --strip-unneeded /usr/local/bin/node");
    expect(dockerfile).toContain("FROM gcr.io/distroless/base-debian12:nonroot AS runner");
    expect(dockerfile).toContain("COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node");
    expect(dockerfile).toContain("libstdc++.so.6");
    expect(dockerfile).toContain("libgcc_s.so.1");
    expect(dockerfile).toContain("LD_LIBRARY_PATH");
    expect(dockerfile).toContain("@img+sharp-libvips-linux-x64@1.3.2");
    expect(dockerfile).toContain(".next/standalone");
    expect(dockerfile).toContain("ENTRYPOINT [\"/usr/local/bin/node\"]");
    expect(dockerfile).toContain("CMD [\"scripts/start-production.mjs\"]");
    expect(dockerfile).toContain("ENV HOSTNAME=0.0.0.0");
    expect(dockerfile).toContain("ENV PORT=3000");
    expect(dockerfile).not.toContain("pnpm install --prod");
    expect(dockerfile).toContain("scripts/apply-migrations.mjs");
    expect(dockerfile).toContain("scripts/start-production.mjs");
    expect(dockerfile).not.toContain("pnpm exec prisma migrate deploy");
    expect(dockerfile).not.toContain('CMD ["sh"');
    expect(nextConfig).toContain('output: "standalone"');
    expect(packageJson.dependencies.prisma).toBeUndefined();
    expect(packageJson.devDependencies.prisma).toBeDefined();
  });

  it("defines isolated app, labs, database, proxy, and backup services with persistent volumes", async () => {
    const compose = await file("compose.yaml");

    for (const service of ["proxy:", "app:", "db:", "labs:", "backup:"]) {
      expect(compose).toContain(service);
    }

    for (const volume of ["postgres-data:", "media-data:", "labs-data:", "backup-data:"]) {
      expect(compose).toContain(volume);
    }

    expect(compose).toContain("POSTGRES_INITDB_ARGS=--encoding=UTF8");
    expect(compose).toContain("${HTTP_PORT:-80}:80");
    expect(compose).toContain("${HTTPS_PORT:-443}:443");
    expect(compose).toContain("image: tech-notes-blog-app");
    expect(compose).not.toContain("mcr.microsoft.com/powershell");
    expect(compose).not.toContain('command: ["sh"');
    expect(compose).toContain('"/usr/local/bin/node"');
    expect(compose).toMatch(/labs-data:\/app\/data\/web-projects(?::rw)?/);
    expect(compose).toContain("labs-data:/usr/share/nginx/html:ro");
    expect(compose.match(/healthcheck:/g)).toHaveLength(5);
    expect(compose.match(/restart: unless-stopped/g)).toHaveLength(5);
  });

  it("routes blog and labs hosts to separate upstreams in Caddy", async () => {
    const caddyfile = await file("docker/Caddyfile");

    expect(caddyfile).toContain("{$BLOG_HOST}");
    expect(caddyfile).toContain("reverse_proxy app:3000");
    expect(caddyfile).toContain("{$LABS_HOST}");
    expect(caddyfile).toContain("reverse_proxy labs:8080");
    expect(caddyfile).toContain("header_down -Set-Cookie");
    expect(caddyfile).toContain("X-Content-Type-Options nosniff");
    expect(caddyfile).toContain("Cache-Control \"no-store\"");
  });

  it("serves labs as static UTF-8 content without API/admin routes or directory listing", async () => {
    const nginx = await file("docker/labs/nginx.conf");

    expect(nginx).toContain("charset utf-8;");
    expect(nginx).toContain("autoindex off;");
    expect(nginx).toContain("location ^~ /api/");
    expect(nginx).toContain("location ^~ /admin/");
    expect(nginx).toContain("return 404;");
    expect(nginx).not.toContain("Set-Cookie");
    expect(nginx).toContain("add_header X-Content-Type-Options nosniff always;");
    expect(nginx).toContain("location ~ ^/projects/([^/]+)/$");
    expect(nginx).toContain("try_files /labs/projects/$1/current/index.html =404;");
  });
});
