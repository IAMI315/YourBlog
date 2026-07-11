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

    expect(dockerfile).toContain("ca-certificates openssl");
    expect(dockerfile).toContain("pnpm-workspace.yaml");
    expect(dockerfile).toContain("prisma.config.ts ./prisma.config.ts");
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
