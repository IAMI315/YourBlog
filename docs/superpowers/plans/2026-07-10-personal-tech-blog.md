# Personal Technology Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted, single-administrator technology blog with a Notion-style editor, isolated HTML/ZIP web-project publishing, backups, and the approved editorial glass design.

**Architecture:** Use a modular Next.js monolith whose feature modules expose narrow public interfaces and depend inward on domain types and ports. PostgreSQL stores structured content, local Docker volumes store media and web projects, Caddy routes the blog and labs hostnames, and a read-only static container serves untrusted web projects.

**Tech Stack:** Node.js 24.18+, pnpm 11.11.0, Next.js 16.2.10, React 19.2.7, TypeScript 6.0.3, TipTap 3.27.3, Prisma 7.8.0, PostgreSQL 17, Vitest 4.1.10, Playwright 1.61.1, Zod 4.4.3, Argon2 0.44.0, Caddy 2, Docker Compose.

## Global Constraints

- All repository text files use UTF-8 without a BOM and LF line endings; HTML and JSON responses declare UTF-8 explicitly.
- TypeScript strict mode is mandatory; feature modules import other features only through `public.ts`.
- Domain files do not import Next.js, Prisma, React, filesystem, archive, or HTTP implementations.
- Circular dependencies and cross-module internal imports fail continuous integration.
- Initial feature modules are `auth`, `articles`, `taxonomy`, `media`, `web-projects`, `site-settings`, and `backups`.
- Public features exclude comments, public accounts, multiple administrators, role management, scheduled publishing, newsletters, and two-factor authentication.
- Uploaded web projects execute only on `LABS_HOST`; authentication cookies are host-only for `BLOG_HOST`.
- Repeated content cards use at most an 8 px radius. Motion is state-driven and honors `prefers-reduced-motion`.
- Every behavior change follows red-green-refactor and ends in an independently reviewable commit.

---

## File Structure

```text
src/
  app/                         Next.js routes and composition only
  components/design-system/    Reusable controls with no business rules
  infrastructure/              Prisma, filesystem, logging, and HTTP adapters
  modules/
    auth/                       Login, sessions, password reset
    articles/                   Drafts, revisions, publishing, recycle bin
    taxonomy/                   Categories and tags
    media/                      Image validation, variants, local storage
    web-projects/               Archive validation, preview, publish, rollback
    site-settings/              Editable blog identity, navigation, SEO
    backups/                    Backup records and status presentation
tests/
  architecture/                UTF-8 and dependency-boundary checks
  integration/                 PostgreSQL and filesystem adapter tests
e2e/                           Playwright browser and security workflows
prisma/                        Schema, migrations, and seed
scripts/                       Encoding, backup, restore, and admin reset tools
docker/                        Caddy, labs static server, application images
```

Each module uses `domain/`, `application/`, `ports/`, `adapters/`, optional `ui/`, colocated tests, and a `public.ts` export boundary.

---

### Task 1: Project Foundation, UTF-8 Enforcement, and Architecture Guards

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml` through `pnpm install`
- Create: `.editorconfig`
- Create: `.gitattributes`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `dependency-cruiser.cjs`
- Create: `scripts/check-utf8.mjs`
- Create: `tests/architecture/utf8.test.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

**Interfaces:**
- Consumes: approved design specification only.
- Produces: `pnpm test`, `pnpm check:utf8`, `pnpm check:boundaries`, `pnpm lint`, and `pnpm typecheck` commands used by every later task.

- [ ] **Step 1: Create the pinned package manifest and repository configuration**

Create `package.json` with exact versions and scripts:

```json
{
  "name": "tech-notes-blog",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@11.11.0",
  "engines": { "node": ">=24.18.0 <25" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:utf8": "node scripts/check-utf8.mjs",
    "check:boundaries": "depcruise src --config dependency-cruiser.cjs",
    "verify": "pnpm check:utf8 && pnpm check:boundaries && pnpm lint && pnpm typecheck && pnpm test"
  },
  "dependencies": {
    "@prisma/adapter-pg": "7.8.0",
    "@prisma/client": "7.8.0",
    "@tiptap/extension-image": "3.27.3",
    "@tiptap/extension-link": "3.27.3",
    "@tiptap/extension-table": "3.27.3",
    "@tiptap/react": "3.27.3",
    "@tiptap/starter-kit": "3.27.3",
    "argon2": "0.44.0",
    "lucide-react": "1.24.0",
    "nanoid": "5.1.16",
    "next": "16.2.10",
    "pg": "8.22.0",
    "pino": "10.3.1",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "server-only": "0.0.1",
    "sharp": "0.35.3",
    "yauzl-promise": "4.0.0",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@testing-library/react": "16.3.2",
    "@types/node": "26.1.1",
    "@types/pg": "8.20.0",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@types/yazl": "3.3.1",
    "dependency-cruiser": "18.0.0",
    "eslint": "10.6.0",
    "eslint-config-next": "16.2.10",
    "jsdom": "29.1.1",
    "prisma": "7.8.0",
    "tsx": "4.23.0",
    "typescript": "6.0.3",
    "vitest": "4.1.10",
    "yazl": "3.3.1"
  }
}
```

Create `.editorconfig` and `.gitattributes`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.zip binary
```

- [ ] **Step 2: Install dependencies and create the minimal Next.js shell**

Run:

```powershell
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm install
```

Expected: `pnpm-lock.yaml` is created and installation exits `0`.

Create strict TypeScript, Next.js, Vitest, and ESLint configuration. `src/app/layout.tsx` must export UTF-8 metadata and load `globals.css`; `src/app/page.tsx` must render `技术笔记` so Chinese text is present from the first build.

- [ ] **Step 3: Write the failing UTF-8 test**

Create `tests/architecture/utf8.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inspectTextBuffer } from "../../scripts/check-utf8.mjs";

describe("UTF-8 repository guard", () => {
  it("rejects a UTF-8 BOM", () => {
    expect(inspectTextBuffer(Buffer.from([0xef, 0xbb, 0xbf, 0x61]))).toEqual({
      ok: false,
      reason: "UTF-8 BOM is not allowed",
    });
  });

  it("accepts Chinese UTF-8 with LF line endings", () => {
    expect(inspectTextBuffer(Buffer.from("技术教程\n", "utf8"))).toEqual({ ok: true });
  });
});
```

- [ ] **Step 4: Run the test and confirm the expected failure**

Run: `pnpm vitest run tests/architecture/utf8.test.ts`

Expected: FAIL because `scripts/check-utf8.mjs` does not exist.

- [ ] **Step 5: Implement the UTF-8 guard and dependency rules**

Create `scripts/check-utf8.mjs` with an exported `inspectTextBuffer(buffer)` that rejects BOM bytes, invalid UTF-8 via `TextDecoder("utf-8", { fatal: true })`, CRLF, and lone CR. Its CLI walks repository text extensions while excluding `.git`, `.next`, `node_modules`, coverage, and binary fixtures; it exits nonzero and prints relative paths on failure.

Create `dependency-cruiser.cjs` with rules that forbid cycles, imports from `src/modules/<feature>/**` into another feature except its `public.ts`, and imports from `domain/**` into `next`, `react`, Prisma, Node filesystem, `infrastructure`, or `adapters`.

- [ ] **Step 6: Verify foundation checks**

Run:

```powershell
pnpm vitest run tests/architecture/utf8.test.ts
pnpm check:utf8
pnpm check:boundaries
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands exit `0`; build output includes `/`.

- [ ] **Step 7: Commit**

```powershell
git add package.json pnpm-lock.yaml .editorconfig .gitattributes tsconfig.json next.config.ts vitest.config.ts dependency-cruiser.cjs scripts tests src
git commit -m "chore: establish utf-8 modular project foundation"
```

---

### Task 2: PostgreSQL Schema and Shared Infrastructure Ports

**Files:**
- Create: `prisma.config.ts`
- Create: `prisma/schema.prisma`
- Create: `compose.test.yaml`
- Create: `src/generated/prisma/` through `prisma generate`
- Create: `src/infrastructure/db/prisma.ts`
- Create: `src/infrastructure/errors/app-error.ts`
- Create: `src/infrastructure/storage/storage-port.ts`
- Create: `src/infrastructure/time/clock.ts`
- Create: `tests/integration/database.test.ts`

**Interfaces:**
- Consumes: environment variable `DATABASE_URL`.
- Produces: `prisma`, `AppError`, `StoragePort`, and `Clock` used by all feature modules.

- [ ] **Step 1: Define shared interfaces**

Create exact interfaces:

```ts
export interface StoragePort {
  write(key: string, data: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array>;
  move(sourceKey: string, destinationKey: string): Promise<void>;
  removeTree(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}
```

`AppError` contains `code`, `status`, and `safeMessage`; no route returns `error.message` directly.

- [ ] **Step 2: Create the Prisma schema**

Define models for `Admin`, `Session`, `Article`, `ArticleRevision`, `Category`, `Tag`, `ArticleTag`, `MediaAsset`, `WebProject`, `WebProjectVersion`, `SiteSettings`, and `BackupRecord`. Use `Json` for TipTap content, `deletedAt` for article recycle-bin retention, unique slugs, indexed publication fields, and relations that match the design spec. Configure the Prisma 7 client generator output as `../src/generated/prisma` and PostgreSQL as the datasource provider.

Create `prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

- [ ] **Step 3: Write the failing database integration test**

Create `tests/integration/database.test.ts` that inserts an article titled `中文编码测试`, reads it through Prisma, and expects the exact title and a TipTap paragraph containing `保持 UTF-8`.

- [ ] **Step 4: Start PostgreSQL and verify the test fails before migration**

Run:

```powershell
docker compose -f compose.test.yaml up -d db
$env:DATABASE_URL='postgresql://blog:blog@localhost:5433/blog_test'
pnpm prisma generate
pnpm vitest run tests/integration/database.test.ts
```

Expected: FAIL because the `Article` table does not exist.

- [ ] **Step 5: Create the initial migration and Prisma adapter**

Run `pnpm prisma migrate dev --name initial`. Create `src/infrastructure/db/prisma.ts` using `PrismaPg` with `DATABASE_URL` and a development singleton to avoid duplicate pools during hot reload.

- [ ] **Step 6: Verify schema and UTF-8 persistence**

Run:

```powershell
pnpm vitest run tests/integration/database.test.ts
pnpm prisma migrate status
pnpm check:utf8
pnpm typecheck
```

Expected: integration test PASS; migration status reports the database is up to date.

- [ ] **Step 7: Commit**

```powershell
git add prisma.config.ts prisma compose.test.yaml src/generated src/infrastructure tests/integration/database.test.ts
git commit -m "feat: add postgres schema and infrastructure ports"
```

---

### Task 3: Single-Administrator Password Authentication

**Files:**
- Create: `src/modules/auth/domain/auth-types.ts`
- Create: `src/modules/auth/ports/auth-repository.ts`
- Create: `src/modules/auth/application/authenticate.ts`
- Create: `src/modules/auth/application/require-session.ts`
- Create: `src/modules/auth/adapters/prisma-auth-repository.ts`
- Create: `src/modules/auth/public.ts`
- Create: `src/modules/auth/application/authenticate.test.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `scripts/reset-admin-password.ts`

**Interfaces:**
- Consumes: Prisma, Argon2, `Clock`.
- Produces: `authenticate(input): Promise<AuthResult>`, `requireAdminSession(): Promise<AdminIdentity>`, and `resetAdminPassword(password)`.

- [ ] **Step 1: Write failing authentication tests**

Test exact Chinese-safe outcomes: valid password returns a session token once, invalid password returns `INVALID_CREDENTIALS`, five failures within 15 minutes return `RATE_LIMITED`, an expired session is rejected, and repository calls never receive a plaintext password for storage.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/auth/application/authenticate.test.ts`

Expected: FAIL because `authenticate` is missing.

- [ ] **Step 3: Implement the domain port and application service**

Use these public types:

```ts
export type AuthenticateInput = { password: string; ipHash: string };
export type AuthResult =
  | { ok: true; sessionToken: string; expiresAt: Date }
  | { ok: false; code: "INVALID_CREDENTIALS" | "RATE_LIMITED" };

export interface AuthRepository {
  getAdmin(): Promise<{ id: string; passwordHash: string } | null>;
  countRecentFailures(ipHash: string, since: Date): Promise<number>;
  recordFailure(ipHash: string, occurredAt: Date): Promise<void>;
  createSession(input: { adminId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findSession(tokenHash: string): Promise<{ adminId: string; expiresAt: Date } | null>;
}
```

Generate 32 random bytes for the browser token and store only its SHA-256 hash. Set a seven-day expiry. Keep rate-limit records free of raw IP addresses.

- [ ] **Step 4: Implement login UI, protected layout, and reset command**

The login action validates with Zod, sets `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and no `Domain` attribute, then redirects to `/admin`. `requireAdminSession` redirects missing or expired sessions. `scripts/reset-admin-password.ts` accepts an interactive hidden prompt or `ADMIN_NEW_PASSWORD`, enforces at least 14 characters, hashes with Argon2id, and revokes existing sessions.

- [ ] **Step 5: Verify authentication**

Run:

```powershell
pnpm vitest run src/modules/auth/application/authenticate.test.ts
pnpm check:boundaries
pnpm typecheck
pnpm test
```

Expected: all tests PASS and dependency-cruiser reports no violations.

- [ ] **Step 6: Commit**

```powershell
git add src/modules/auth src/app/admin scripts/reset-admin-password.ts prisma
git commit -m "feat: add secure single-admin authentication"
```

---

### Task 4: Editable Site Settings and Public Application Shell

**Files:**
- Create: `src/modules/site-settings/domain/site-settings.ts`
- Create: `src/modules/site-settings/ports/site-settings-repository.ts`
- Create: `src/modules/site-settings/application/update-site-settings.ts`
- Create: `src/modules/site-settings/adapters/prisma-site-settings-repository.ts`
- Create: `src/modules/site-settings/public.ts`
- Create: `src/modules/site-settings/application/update-site-settings.test.ts`
- Create: `src/app/admin/(protected)/settings/page.tsx`
- Create: `src/app/admin/(protected)/settings/actions.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/design-system/button.tsx`
- Create: `src/components/design-system/field.tsx`
- Create: `src/components/site/header.tsx`
- Create: `src/components/site/footer.tsx`

**Interfaces:**
- Consumes: authenticated admin and Prisma.
- Produces: `getSiteSettings()` and `updateSiteSettings(input)` for public metadata and administration forms.

- [ ] **Step 1: Write failing settings tests**

Assert that Chinese values round-trip, an empty blog name fails with `BLOG_NAME_REQUIRED`, external social links require HTTPS, and navigation accepts only the approved internal route set.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/site-settings/application/update-site-settings.test.ts`

Expected: FAIL because the service is absent.

- [ ] **Step 3: Implement settings service and Prisma adapter**

Use one `SiteSettings` row with ID `site`. Validate this input:

```ts
export type SiteSettingsInput = {
  blogName: string;
  authorName: string;
  authorBio: string;
  homeTitle: string;
  homeDescription: string;
  avatarMediaId: string | null;
  navigation: Array<{ label: string; href: "/" | "/tutorials" | "/labs" | "/archive" | "/about" }>;
  socialLinks: Array<{ label: string; url: string }>;
  seoTitle: string;
  seoDescription: string;
};
```

- [ ] **Step 4: Build the quiet administration shell and settings form**

Use a fixed-width sidebar on desktop and a menu drawer on mobile. Controls use Lucide icons, visible labels, 6 px radii, and no decorative dashboard cards. Save through a server action and show field-level Chinese errors plus a success toast.

- [ ] **Step 5: Render public metadata and shell from settings**

The root layout reads settings, emits UTF-8 metadata, and renders the editable header and footer. The first viewport displays the blog identity rather than generic marketing copy.

- [ ] **Step 6: Verify and commit**

Run `pnpm verify` and expect exit `0`, then:

```powershell
git add src/modules/site-settings src/components src/app
git commit -m "feat: add editable site identity and application shell"
```

---

### Task 5: Article, Taxonomy, Revision, and Publishing Domain

**Files:**
- Create: `src/modules/articles/domain/article.ts`
- Create: `src/modules/articles/ports/article-repository.ts`
- Create: `src/modules/articles/application/save-draft.ts`
- Create: `src/modules/articles/application/publish-article.ts`
- Create: `src/modules/articles/application/restore-revision.ts`
- Create: `src/modules/articles/application/recycle-article.ts`
- Create: `src/modules/articles/adapters/prisma-article-repository.ts`
- Create: `src/modules/articles/public.ts`
- Create: `src/modules/articles/application/article-workflow.test.ts`
- Create: `src/modules/taxonomy/domain/taxonomy.ts`
- Create: `src/modules/taxonomy/public.ts`

**Interfaces:**
- Consumes: Prisma, `Clock`, site cache invalidation adapter.
- Produces: draft, publish, restore, recycle, and article query services.

- [ ] **Step 1: Write failing article workflow tests**

Cover deterministic Chinese slug fallback, autosave without a revision when content is unchanged, revision creation when content changes, retention of exactly 20 revisions, publish rejection without title/content, atomic publish result, recycle-bin timestamp, and recovery before 30 days.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/articles/application/article-workflow.test.ts`

Expected: FAIL because article services are missing.

- [ ] **Step 3: Define article JSON and service contracts**

```ts
export type ArticleStatus = "DRAFT" | "PUBLISHED";
export type ArticleDraftInput = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  coverMediaId: string | null;
  content: Record<string, unknown>;
  categoryId: string | null;
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
};

export interface ArticleService {
  saveDraft(input: ArticleDraftInput): Promise<{ id: string; revision: number }>;
  publish(id: string): Promise<{ slug: string; publishedAt: Date }>;
  restoreRevision(articleId: string, revision: number): Promise<void>;
  recycle(id: string): Promise<void>;
  recover(id: string): Promise<void>;
}
```

Use transactions for revision retention and publishing. Normalize slugs with lowercase ASCII where available; for a title containing only non-ASCII characters, use `article-` plus a stable eight-character hash.

- [ ] **Step 4: Implement taxonomy ownership**

Taxonomy owns category/tag CRUD and unique slugs. Articles store only taxonomy IDs and consume taxonomy through `src/modules/taxonomy/public.ts`.

- [ ] **Step 5: Verify workflow and commit**

Run `pnpm vitest run src/modules/articles src/modules/taxonomy`, `pnpm check:boundaries`, and `pnpm typecheck`; expect PASS. Commit:

```powershell
git add src/modules/articles src/modules/taxonomy prisma
git commit -m "feat: add article revisions taxonomy and publishing"
```

---

### Task 6: Notion-Style Block Editor and Article Administration

**Files:**
- Create: `src/modules/articles/ui/article-editor.tsx`
- Create: `src/modules/articles/ui/slash-menu.tsx`
- Create: `src/modules/articles/ui/editor-toolbar.tsx`
- Create: `src/modules/articles/ui/use-autosave.ts`
- Create: `src/modules/articles/ui/article-editor.test.tsx`
- Create: `src/app/admin/(protected)/articles/page.tsx`
- Create: `src/app/admin/(protected)/articles/new/page.tsx`
- Create: `src/app/admin/(protected)/articles/[id]/page.tsx`
- Create: `src/app/admin/(protected)/articles/[id]/actions.ts`
- Create: `src/app/admin/(protected)/articles/[id]/preview/page.tsx`

**Interfaces:**
- Consumes: article application services and later `MediaPicker` public component.
- Produces: accessible editor with slash insertion, drag ordering, autosave state, preview, publish, revisions, and recycle actions.

- [ ] **Step 1: Write failing editor interaction tests**

Using Testing Library and jsdom, assert that typing `/` opens a keyboard-navigable menu, selecting `代码块` inserts a code block, autosave waits until 1.5 seconds after the last edit, offline failure retains the local JSON and shows `尚未同步`, and publish is disabled while save is pending.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/articles/ui/article-editor.test.tsx`

Expected: FAIL because `ArticleEditor` is missing.

- [ ] **Step 3: Implement TipTap extensions and editor controls**

Configure StarterKit, Image, Link, Table, and custom callout/video nodes. The slash menu exposes paragraph, heading, list, quote, code, image, callout, table, divider, link, and video. Use TipTap JSON as the saved value; never persist rendered HTML as the source of truth.

- [ ] **Step 4: Implement autosave and conflict handling**

`useAutosave` accepts `{ articleId, value, revision, save }`, debounces 1.5 seconds, aborts superseded requests, and requires the expected revision. A `REVISION_CONFLICT` response keeps local content and offers reload or save-as-new-draft rather than overwriting remote content.

- [ ] **Step 5: Build article list, editor, preview, revision, and recycle views**

The article list uses a dense table with status, category, update time, and actions. The editor has a stable content column plus metadata sidebar, not nested cards. Desktop/mobile preview uses a segmented control. Destructive actions require a confirmation dialog.

- [ ] **Step 6: Verify and commit**

Run `pnpm vitest run src/modules/articles`, `pnpm typecheck`, and `pnpm build`; expect PASS. Commit:

```powershell
git add src/modules/articles/ui src/app/admin
git commit -m "feat: add block editor and article administration"
```

---

### Task 7: Media Library and Responsive Image Pipeline

**Files:**
- Create: `src/modules/media/domain/media.ts`
- Create: `src/modules/media/ports/media-repository.ts`
- Create: `src/modules/media/application/upload-media.ts`
- Create: `src/modules/media/adapters/local-media-storage.ts`
- Create: `src/modules/media/adapters/prisma-media-repository.ts`
- Create: `src/modules/media/ui/media-picker.tsx`
- Create: `src/modules/media/public.ts`
- Create: `src/modules/media/application/upload-media.test.ts`
- Create: `src/app/admin/(protected)/media/page.tsx`
- Create: `src/app/api/admin/media/route.ts`
- Create: `src/app/media/[...key]/route.ts`

**Interfaces:**
- Consumes: `StoragePort`, Prisma, Sharp, authenticated admin.
- Produces: `uploadMedia`, `deleteUnusedMedia`, `getMediaUrl`, and `MediaPicker`.

- [ ] **Step 1: Write failing media tests**

Use a real 1x1 PNG fixture. Assert MIME sniffing ignores a spoofed extension, unsupported SVG is rejected in release one, Chinese original names survive metadata storage, random storage keys contain no user path, image dimensions are recorded, and WebP widths 480/960/1600 are generated without upscaling.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/media/application/upload-media.test.ts`

Expected: FAIL because `uploadMedia` is missing.

- [ ] **Step 3: Implement validation, variants, and local storage**

Accept JPEG, PNG, WebP, AVIF, and GIF up to `MEDIA_UPLOAD_MAX_BYTES`. Decode with Sharp before storage. Store original and generated variants under `media/<year>/<month>/<random-id>/`. Return typed metadata and require alternative text before an image can be published in an article.

- [ ] **Step 4: Build media route, library, and editor integration**

The media library provides file upload, search by original name, alternative-text editing, usage count, and deletion only when usage count is zero. The editor supports file picker, drag-and-drop, and clipboard paste through the same upload endpoint.

- [ ] **Step 5: Verify and commit**

Run `pnpm vitest run src/modules/media`, `pnpm check:utf8`, `pnpm typecheck`, and `pnpm build`; expect PASS. Commit:

```powershell
git add src/modules/media src/app/api/admin/media src/app/media src/app/admin
git commit -m "feat: add media library and responsive image pipeline"
```

---

### Task 8: Public Editorial Site, Article Rendering, Archive, and Search

**Files:**
- Delete: `src/app/page.tsx`
- Create: `src/app/(public)/page.tsx`
- Create: `src/app/(public)/tutorials/page.tsx`
- Create: `src/app/(public)/tutorials/[slug]/page.tsx`
- Create: `src/app/(public)/archive/page.tsx`
- Create: `src/app/(public)/about/page.tsx`
- Create: `src/modules/articles/ui/article-renderer.tsx`
- Create: `src/modules/articles/ui/article-renderer.test.tsx`
- Create: `src/modules/articles/application/search-articles.ts`
- Create: `src/modules/articles/application/search-articles.test.ts`
- Create: `src/components/site/editorial-home.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: published article queries, taxonomy public API, site settings, media URLs.
- Produces: public home, tutorial index, article, archive, about, and PostgreSQL full-text search views.

- [ ] **Step 1: Write failing public query and renderer tests**

Assert drafts and recycled articles never appear publicly, Chinese search `自托管` finds the matching tutorial, unknown slugs return no result, code blocks preserve UTF-8 text, and unsafe link protocols are not rendered.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/articles/application/search-articles.test.ts src/modules/articles/ui/article-renderer.test.tsx`

Expected: FAIL because search and renderer exports are absent.

- [ ] **Step 3: Implement public queries, safe rendering, and cache invalidation**

Use PostgreSQL full-text search with a simple configuration plus case-insensitive title/summary fallback for Chinese. Render known TipTap node types through React components, sanitize URL protocols, and revalidate public paths only after successful publish.

- [ ] **Step 4: Implement the approved visual direction**

Build the three-plane editorial home: low-saturation blue/mint/coral environment background with subtle grid, full-width real featured tutorial image with overlaid text, foreground web-experiment prompt, and staggered tutorial items. Use backdrop filters only where underlying color is visible. Provide solid-color fallbacks for unsupported browsers and reduced motion for transitions.

- [ ] **Step 5: Add responsive and metadata behavior**

Ensure the first viewport identifies the blog and reveals the next section. Article typography reserves readable line length; code and tables scroll inside their own content areas. Generate canonical, Open Graph, and description metadata from settings and article fields.

- [ ] **Step 6: Verify and commit**

Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm check:boundaries`; expect PASS. Commit:

```powershell
git add src/app src/components/site src/modules/articles
git commit -m "feat: build editorial public blog and search"
```

---

### Task 9: Safe HTML and ZIP Validation Pipeline

**Files:**
- Create: `src/modules/web-projects/domain/web-project.ts`
- Create: `src/modules/web-projects/ports/web-project-repository.ts`
- Create: `src/modules/web-projects/ports/archive-reader.ts`
- Create: `src/modules/web-projects/ports/web-project-storage.ts`
- Create: `src/modules/web-projects/application/validate-upload.ts`
- Create: `src/modules/web-projects/application/stage-upload.ts`
- Create: `src/modules/web-projects/adapters/yauzl-archive-reader.ts`
- Create: `src/modules/web-projects/application/validate-upload.test.ts`
- Create: `src/modules/web-projects/public.ts`

**Interfaces:**
- Consumes: `StoragePort`, `Clock`, archive reader, configured size/count/ratio limits.
- Produces: `validateUpload(input): Promise<ValidatedUpload>` and `stageUpload(validated): Promise<StagedProject>`.

- [ ] **Step 1: Write failing archive security tests**

Generate ZIPs with Yazl and assert rejection of `../escape.html`, `/absolute.html`, `C:\\escape.html`, duplicate normalized paths, symbolic-link mode bits, missing root `index.html`, too many files, extracted-size overflow, and compression-ratio overflow. These size and ratio cases are the explicit ZIP bomb regression suite. Assert acceptance of Chinese asset names and nested CSS/image paths. Test standalone HTML becomes `index.html`.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/web-projects/application/validate-upload.test.ts`

Expected: FAIL because `validateUpload` is missing.

- [ ] **Step 3: Implement normalized entry validation**

Use this result contract:

```ts
export type UploadLimits = {
  compressedBytes: number;
  extractedBytes: number;
  fileCount: number;
  compressionRatio: number;
};

export type ValidatedUpload = {
  kind: "html" | "zip";
  checksum: string;
  compressedBytes: number;
  extractedBytes: number;
  fileCount: number;
  entries: Array<{ normalizedPath: string; bytes: Uint8Array }>;
};

export interface WebProjectStorage {
  stage(token: string, entries: ValidatedUpload["entries"]): Promise<string>;
  publish(stagingPrefix: string, projectSlug: string, version: number): Promise<string>;
  activate(projectSlug: string, versionPrefix: string): Promise<void>;
  remove(prefix: string): Promise<void>;
}
```

Normalize separators to `/`, reject empty segments plus `.` and `..`, reject control characters, inspect Unix mode bits for symlinks/devices, and accumulate limits before writing any public file.

- [ ] **Step 4: Implement non-public staging**

Call `WebProjectStorage.stage(token, entries)` to write validated entries to `labs/previews/<random-token>/`. Write a generated manifest containing checksum, file count, extracted bytes, and creation time. A failed write removes the entire staging prefix.

- [ ] **Step 5: Verify and commit**

Run `pnpm vitest run src/modules/web-projects`, `pnpm check:boundaries`, and `pnpm typecheck`; expect PASS. Commit:

```powershell
git add src/modules/web-projects
git commit -m "feat: add secure web-project upload validation"
```

---

### Task 10: Web-Project Administration, Preview, Publish, and Rollback

**Files:**
- Create: `src/modules/web-projects/application/publish-project.ts`
- Create: `src/modules/web-projects/application/rollback-project.ts`
- Create: `src/modules/web-projects/adapters/prisma-web-project-repository.ts`
- Create: `src/modules/web-projects/adapters/local-web-project-storage.ts`
- Create: `src/modules/web-projects/ui/project-uploader.tsx`
- Create: `src/modules/web-projects/application/publish-project.test.ts`
- Create: `src/app/admin/(protected)/web-projects/page.tsx`
- Create: `src/app/admin/(protected)/web-projects/new/page.tsx`
- Create: `src/app/admin/(protected)/web-projects/[id]/page.tsx`
- Create: `src/app/api/admin/web-projects/upload/route.ts`
- Create: `src/app/(public)/labs/page.tsx`

**Interfaces:**
- Consumes: Task 9 validation/staging, Prisma, `WebProjectStorage`, `LABS_HOST`.
- Produces: stable project URLs, unlisted preview URLs, atomic publish, current-plus-previous retention, and rollback.

- [ ] **Step 1: Write failing publish lifecycle tests**

Assert preview URL uses a random token, publish moves staged files into `labs/projects/<slug>/<version>`, stable pointer updates only after all files exist, a failed publish preserves the old stable version, the third successful version removes the oldest so two remain, and rollback swaps current/previous without copying user-provided paths.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run src/modules/web-projects/application/publish-project.test.ts`

Expected: FAIL because publish services are missing.

- [ ] **Step 3: Implement transactional metadata and atomic storage changes**

Repository methods use this boundary:

```ts
export interface WebProjectRepository {
  createDraft(input: { title: string; slug: string; summary: string }): Promise<{ id: string }>;
  addVersion(input: { projectId: string; storagePrefix: string; checksum: string; fileCount: number; extractedBytes: number }): Promise<{ id: string; version: number }>;
  setCurrentVersion(projectId: string, versionId: string): Promise<void>;
  listVersions(projectId: string): Promise<Array<{ id: string; version: number; storagePrefix: string }>>;
  removeVersion(versionId: string): Promise<void>;
}
```

`local-web-project-storage.ts` publishes with a same-volume directory rename and activates a version by atomically replacing the application-owned `current` symbolic link. Uploaded archives can never create links. Complete storage movement first, activate the new internal link, then commit database current-version state. If metadata commit fails, reactivate the previous version and remove the new public prefix.

- [ ] **Step 4: Build uploader and public project index**

Uploader shows file selection, byte progress, four validation stages, plain-language failure, isolated preview, and explicit publish. Public `/labs` lists only published projects and links directly to `https://${LABS_HOST}/projects/<slug>/`.

- [ ] **Step 5: Verify and commit**

Run `pnpm vitest run src/modules/web-projects`, `pnpm typecheck`, `pnpm build`, and `pnpm check:utf8`; expect PASS. Commit:

```powershell
git add src/modules/web-projects src/app
git commit -m "feat: publish isolated web projects with rollback"
```

---

### Task 11: Production Docker Compose, Caddy Isolation, Health Checks, and Backups

**Files:**
- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `docker/Caddyfile`
- Create: `docker/labs/nginx.conf`
- Create: `docker/labs/Dockerfile`
- Create: `src/app/api/health/route.ts`
- Create: `src/modules/backups/domain/backup-record.ts`
- Create: `src/modules/backups/public.ts`
- Create: `scripts/backup.ps1`
- Create: `scripts/restore.ps1`
- Create: `scripts/backup.test.ts`
- Create: `tests/integration/proxy-config.test.ts`
- Create: `src/app/admin/(protected)/backups/page.tsx`

**Interfaces:**
- Consumes: application image, PostgreSQL, persistent volumes, `BLOG_HOST`, `LABS_HOST`.
- Produces: one-command production stack, host isolation, nightly backups, and restore tooling.

- [ ] **Step 1: Write failing configuration and retention tests**

Test that Caddy routes only `BLOG_HOST` to `app`, only `LABS_HOST` to `labs`, strips any upstream `Set-Cookie` on labs responses, denies `/api` and `/admin` on labs, adds `X-Content-Type-Options: nosniff`, and marks preview paths `Cache-Control: no-store`. Test backup retention keeps seven daily and four weekly archives.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run scripts/backup.test.ts tests/integration/proxy-config.test.ts`

Expected: FAIL because production configuration and retention logic are absent.

- [ ] **Step 3: Create production images and Compose services**

`compose.yaml` defines `proxy`, `app`, `db`, `labs`, and `backup`; named volumes are `postgres-data`, `media-data`, `labs-data`, and `backup-data`. The labs volume is read-write for `app` and read-only for `labs`. PostgreSQL initializes with `POSTGRES_INITDB_ARGS=--encoding=UTF8`. Every long-running service has a health check and restart policy.

- [ ] **Step 4: Implement Caddy and labs security headers**

Caddy obtains certificates for both hosts and never forwards labs requests to Next.js. Nginx serves static files with no directory listing, no cookies, no server-side execution, UTF-8 default charset, no API route, and a stable project path that resolves to the current published version.

- [ ] **Step 5: Implement backup and restore scripts**

The backup script runs `pg_dump` plus archives media and labs volumes into a timestamped directory, writes SHA-256 checksums, records success/failure in PostgreSQL, and applies seven-daily/four-weekly retention. Restore requires an explicit archive path, verifies checksums, restores into empty target volumes, and refuses to overwrite a running production stack.

- [ ] **Step 6: Verify containers and restore drill**

Run:

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
pnpm vitest run scripts/backup.test.ts tests/integration/proxy-config.test.ts
```

Expected: configuration and tests PASS; all services report healthy. Create a backup, restore it into test volumes, and query the Chinese integration article plus one web-project `index.html`.

- [ ] **Step 7: Commit**

```powershell
git add Dockerfile compose.yaml .env.example docker scripts src/modules/backups src/app/api/health src/app/admin
git commit -m "feat: add isolated docker deployment and backups"
```

---

### Task 12: End-to-End, Security, Accessibility, Visual Verification, and Operator Documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/auth.spec.ts`
- Create: `e2e/article-workflow.spec.ts`
- Create: `e2e/media.spec.ts`
- Create: `e2e/web-project.spec.ts`
- Create: `e2e/responsive-visual.spec.ts`
- Create: `e2e/accessibility.spec.ts`
- Create: `tests/security/labs-isolation.test.ts`
- Create: `docs/deployment.md`
- Create: `docs/content-guide.md`
- Create: `docs/backup-and-restore.md`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: the complete Docker Compose stack.
- Produces: repeatable acceptance suite and non-programmer operating documentation.

- [ ] **Step 1: Add failing Playwright acceptance tests**

Cover login failure/rate limit, successful login, article creation with heading/code/image/callout/table, autosave, desktop/mobile preview, publish, revision restore, recycle recovery, standalone HTML upload, ZIP upload with Chinese file names, isolated preview, publish, second version, rollback, settings update, and public search.

- [ ] **Step 2: Add security and cross-origin tests**

From a labs page, attempt credentialed fetches to blog administration endpoints and expect no readable response. Verify labs responses contain no blog cookie, archive attack fixtures are rejected, admin state changes reject missing CSRF tokens, and public routes never return draft content.

- [ ] **Step 3: Add responsive visual and accessibility tests**

Capture desktop 1440x1000, tablet 834x1112, and mobile 390x844 screenshots for home, article, login, editor, media, uploader, and labs index. Assert no horizontal document overflow. Run axe against the same views and require zero critical or serious findings. Check keyboard focus through navigation, editor toolbar, dialogs, and upload controls.

- [ ] **Step 4: Run the suite and record expected failures**

Run:

```powershell
pnpm exec playwright install chromium
pnpm exec playwright test
pnpm verify
```

Expected before final fixes: failures identify any incomplete browser workflow, visual overlap, accessibility issue, or isolation header.

- [ ] **Step 5: Fix only the reported acceptance gaps and rerun**

For each failing assertion, add the smallest implementation change in its owning module. Do not bypass assertions or broaden module imports. Rerun the focused failing spec, then the complete suite.

- [ ] **Step 6: Write operator documentation**

`docs/deployment.md` gives copyable Docker Compose setup, DNS, first-admin, upgrade, health, and password-reset commands. `docs/content-guide.md` explains every editor block, preview/publish, revisions, recycle bin, media alternative text, and HTML/ZIP upload in non-technical Chinese. `docs/backup-and-restore.md` documents backup status, manual backup, checksum verification, clean restore, and rollback.

- [ ] **Step 7: Run final verification**

Run:

```powershell
pnpm verify
pnpm exec playwright test
docker compose config
docker compose ps
git diff --check
git status --short
```

Expected: all checks PASS; Compose services are healthy; `git diff --check` prints nothing; only intended final documentation/test changes are uncommitted.

- [ ] **Step 8: Commit**

```powershell
git add playwright.config.ts e2e tests/security docs README.md package.json pnpm-lock.yaml src
git commit -m "test: complete blog acceptance and operator guides"
```

- [ ] **Step 9: Perform final manual acceptance**

Open both configured HTTPS hostnames. Verify the public blog and labs project render correctly, the administration cookie is absent from labs requests, Chinese text is intact in editor/database/HTML/search/backup restore, and every acceptance criterion in the design specification has direct evidence.
