# Personal Technology Blog Design

Date: 2026-07-10
Status: Approved

## 1. Purpose

Build a self-hosted personal technology blog that can be maintained entirely through a browser. The public site presents technology tutorials and interactive web projects with an Apple-inspired editorial design. A single administrator can create and publish content without editing source code.

The application is deployed to the owner's server with Docker Compose. Uploaded HTML and ZIP web projects run on a separate subdomain so their JavaScript cannot access the blog administration session.

## 2. Goals

- Publish readable, visually polished technology tutorials.
- Provide a Notion-style block editor with autosave, drag reordering, image upload, code blocks, callouts, tables, links, and video embeds.
- Upload a standalone HTML file or ZIP web package and publish it at a stable URL.
- Manage the site name, author profile, navigation, home-page copy, social links, and SEO settings through the administration interface.
- Deploy, upgrade, restart, and back up the complete system through Docker Compose.
- Preserve content revisions and allow safe rollback after editing or upload mistakes.
- Support desktop, tablet, and mobile layouts and accessible keyboard operation.

## 3. Non-Goals

The first release does not include comments, public user accounts, multiple administrators, role management, scheduled publishing, newsletters, billing, or external identity providers. The administrator signs in with a password only; two-factor authentication and email-based password recovery are out of scope.

## 4. Visual Direction

The approved home page uses the fourth visual concept, an editorial layout with three depth planes:

1. A low-saturation environment background with cool blue, mint, and warm coral color fields, a subtle grid, and restrained glass treatment.
2. A full-width featured tutorial stage using a real technology image and overlaid editorial typography.
3. A foreground web-experiment prompt that overlaps the featured stage, followed by staggered tutorial items.

The visual language is inspired by Apple's precision, typography, spacing, and material depth without copying Apple branding or page structures. It also incorporates the translucent navigation and layered surfaces seen on the referenced FlowPilot tutorial site. Glass effects must remain readable and purposeful rather than turning every section into a white card.

Repeated content cards use a maximum 8 px radius. Navigation pills and compact status chips may use fully rounded geometry. Typography uses zero letter spacing, stable responsive sizes, and clear Chinese rendering in UTF-8. Motion is brief and state-driven, and respects `prefers-reduced-motion`.

## 5. System Architecture

The system consists of the following Docker Compose services:

- `proxy`: Caddy terminates HTTPS, obtains certificates, and routes requests by hostname.
- `app`: A Next.js application provides the public blog, administration interface, API, authentication, block editor integration, search, media processing, and upload workflow.
- `db`: PostgreSQL stores structured application data.
- `labs`: A minimal static web server exposes approved web-project files from a read-only volume.
- `backup`: A scheduled container creates database and file backups and records execution results.

The deployment uses two configured hostnames:

- `BLOG_HOST` serves the public blog and `/admin`.
- `LABS_HOST` serves uploaded web projects only.

The `labs` service does not receive blog cookies, database credentials, or administration API access. The administration session cookie is host-only for `BLOG_HOST`; it never sets a parent-domain `Domain` attribute. CORS is disabled for administration endpoints. Same-origin browser rules therefore prevent uploaded JavaScript from reading blog data.

Persistent volumes store PostgreSQL data, article media, published web-project files, and backup archives. The `app` service has write access to media and web-project volumes. The `labs` service mounts only the published web-project volume and mounts it read-only.

## 6. Technology Choices

- Next.js with TypeScript for the public and administration application.
- TipTap for the Notion-style block editor.
- PostgreSQL for structured data.
- Prisma for schema migrations and database access.
- Local persistent volumes for media and web-project storage.
- Caddy for HTTPS and hostname routing.
- A static Nginx-compatible server for the isolated `labs` hostname.
- Vitest for unit and integration tests.
- Playwright for browser workflows and responsive visual checks.

The application remains a modular monolith. Public pages, administration pages, content services, upload validation, and storage adapters have separate module boundaries but ship as one application container. This keeps deployment simple while allowing each unit to be tested independently.

## 7. Code Architecture and Quality

The codebase is organized by business capability rather than by technical file type. Initial feature modules are `auth`, `articles`, `taxonomy`, `media`, `web-projects`, `site-settings`, and `backups`. Each module owns its domain types, application services, persistence adapter, validation, and tests.

Modules communicate only through documented public exports. A feature must not import another feature's internal files, database implementation, or UI internals. Shared code is limited to stable infrastructure primitives such as database access, storage ports, logging, HTTP errors, and reusable design-system controls. Business-specific helpers remain inside their owning feature.

Dependencies point inward:

1. Domain rules and types do not depend on Next.js, Prisma, the filesystem, or UI code.
2. Application services depend on domain types and explicit ports.
3. Prisma, filesystem, archive, image, and HTTP implementations satisfy those ports at the outer adapter layer.
4. Routes and React components call application services through public module interfaces.

Files and functions have one clear responsibility. TypeScript strict mode is mandatory. Public interfaces use explicit types, boundary input is validated, and errors use typed application error classes. Circular imports are rejected in continuous integration. Comments explain non-obvious decisions and security constraints rather than narrating straightforward code.

UTF-8 is enforced end to end. Source, configuration, documentation, templates, migrations, and test fixtures use UTF-8 without a BOM and LF line endings. `.editorconfig` and repository checks enforce these rules. PostgreSQL is initialized with UTF-8 encoding. HTML and JSON responses declare UTF-8 explicitly. Tests include Chinese article titles, block content, file names, categories, search terms, export data, and error messages to catch encoding regressions.

## 8. Administration Experience

The administration interface contains these primary sections:

- Overview
- Tutorial articles
- Web projects
- Media library
- Categories and tags
- Site settings
- Backup status

The single administrator signs in at `/admin/login`. Successful login creates a secure server-side session represented by an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. The password is stored as an Argon2 hash. Repeated login failures are rate limited. A forgotten password is reset with a one-time Docker command on the server.

## 9. Article Workflow

An article moves through the following workflow:

1. Create a draft and provide a title, summary, category, tags, and optional cover image.
2. Edit content using blocks. Supported initial blocks are paragraph, heading, list, quote, code, image, callout, table, divider, link, and video embed.
3. Autosave the current draft every few seconds after changes stop. Keep the latest 20 revisions.
4. Preview the complete desktop and mobile article without publishing it.
5. Publish manually. Publishing creates or updates a stable slug, search entry, archive entry, and public page.

Publishing is atomic: the visible article changes only after content, metadata, and search indexing complete successfully. Deleting an article moves it to a recycle bin for 30 days before permanent removal.

## 10. Web-Project Upload Workflow

The administrator can upload either a single `.html` file or a `.zip` package. The default upload limit is 100 MB and is configurable through an environment variable.

For a single HTML file, the application creates a version directory and stores the file as `index.html`. For ZIP input, validation occurs before publication:

1. Confirm the extension and detected content type.
2. Enforce compressed size, extracted size, file-count, and compression-ratio limits.
3. Reject absolute paths, parent-directory traversal, symbolic links, device files, duplicate normalized paths, and invalid file names.
4. Require `index.html` at the package root.
5. Extract into a non-public staging directory.
6. Move the validated files to `/data/labs/previews/<random-token>` and generate an unlisted preview URL on `LABS_HOST`. Preview responses use `Cache-Control: no-store`.
7. Publish by atomically moving the validated version to `/data/labs/projects/<project-slug>/<version>` and updating the stable project path.

HTML, CSS, browser JavaScript, images, fonts, and other static assets are allowed. Server-side executable files are never run. Failed validation leaves the existing published version unchanged and returns a plain-language error. Each web project retains exactly the current version and the immediately previous published version; older versions are removed after the new publication completes successfully.

## 11. Data Model

### Administrator

Stores identifier, password hash, session records, creation time, password-change time, and last-login time.

### Article

Stores title, slug, summary, cover reference, TipTap JSON content, publication status, publication time, creation and update times, SEO fields, category relation, and tag relations.

### Article Revision

Stores an immutable article content and metadata snapshot, revision number, and creation time. The application retains the latest 20 revisions per article.

### Category and Tag

Stores name, slug, description, ordering information, and article relations.

### Media Asset

Stores original file name, storage key, MIME type, dimensions, byte size, checksum, alternative text, upload time, and usage references.

### Web Project

Stores title, slug, summary, cover reference, publication status, current version, stable public URL, creation time, and update time.

### Web Project Version

Stores storage directory, entry point, compressed size, extracted size, file count, checksum, validation result, creation time, and publication time.

### Site Settings

Stores the blog name, author profile, avatar, home-page text, navigation items, social links, and default SEO data. The first release does not expose a general-purpose theme editor.

### Backup Record

Stores start and completion times, included data sets, archive size, status, and a sanitized error message when a backup fails.

## 12. Error Handling and Security

- Validate all browser inputs on the server and return field-specific, plain-language errors.
- Do not expose server paths, credentials, SQL errors, or stack traces to the browser.
- Preserve local editor changes during temporary network failure and offer synchronization after reconnecting.
- Use CSRF protection for state-changing administration requests.
- Validate image and attachment content independently of the supplied file extension.
- Generate random storage names and never use an uploaded name as a filesystem path.
- Apply archive extraction limits before and during extraction to defend against ZIP bombs.
- Set no authentication cookies on `LABS_HOST` and do not route application API paths from that hostname.
- Serve all generated HTML and JSON with an explicit UTF-8 charset and store repository text files as UTF-8 without a BOM.
- Publish articles and web-project versions with atomic state changes.
- Emit structured logs for application errors, authentication events, upload validation, publishing, and backups while excluding secrets and article bodies.

## 13. Backup and Recovery

The backup service runs nightly. It creates a PostgreSQL dump and archives media plus published web-project files. It retains seven daily backups and four weekly backups. Backup status is displayed in the administration interface.

The project documentation includes commands to restore the database, media files, and web-project volume into a clean deployment. Release acceptance includes restoring a backup and verifying that article and web-project URLs still work.

## 14. Testing Strategy

### Unit Tests

Cover slug generation, article state transitions, authorization, storage-key generation, file-name normalization, archive path validation, size limits, file-count limits, compression-ratio checks, and UTF-8 round trips for Chinese content and file names.

### Integration Tests

Cover password login, rate limiting, session expiry, autosave, revision retention, image upload, article publishing, archive extraction, version rollback, search indexing, recycle-bin retention, and database migrations.

### End-to-End Tests

Use Playwright to verify these workflows:

- Sign in, create a tutorial with multiple block types, preview it, and publish it.
- Upload images through paste, drag-and-drop, and the file picker.
- Upload a standalone HTML file, preview it, and publish it on `LABS_HOST`.
- Upload a valid ZIP project, publish a new version, and roll back.
- Change site settings and verify the public site updates.
- Restore an article revision and recover an item from the recycle bin.

### Security Tests

Exercise path traversal, absolute archive paths, symbolic links, ZIP bombs, excessive file counts, oversized uploads, spoofed media types, login brute-force attempts, CSRF attempts, and cross-origin reads from `LABS_HOST`.

### Visual and Accessibility Tests

Capture and inspect screenshots for public, article, login, editor, media, and upload views at desktop, tablet, and mobile widths. Verify no overlap, clipping, blank images, or unreadable glass surfaces. Run automated accessibility checks and manually verify keyboard focus order, form labels, image alternative text, and reduced-motion behavior.

### Architecture Tests

Check that feature modules import only their declared public interfaces, domain code has no framework or adapter dependencies, and the dependency graph contains no cycles. Repository checks reject non-UTF-8 text files, unexpected BOM markers, and inconsistent line endings.

## 15. Performance and Caching

Public pages use server rendering with cache invalidation on publish. Administration bundles are not loaded on public pages. Uploaded images generate responsive variants and modern formats. Public article pages expose appropriate cache headers, while administration and preview responses are private and non-cacheable.

Database indexes cover article status and publication time, unique slugs, categories, tags, and web-project status. Search initially uses PostgreSQL full-text search, avoiding an additional search service.

## 16. Deployment and Configuration

The repository provides:

- `compose.yaml` for production services and persistent volumes.
- `.env.example` documenting required hostnames, secrets, upload limits, and retention settings.
- Database migration and initial-administrator setup commands.
- Health checks for the proxy, application, database, and labs service.
- Deployment, upgrade, backup, restore, and password-reset documentation written for a non-programmer.

The deployment succeeds when a clean server with Docker Compose can start the stack, initialize the database, create the administrator, obtain HTTPS certificates for both hostnames, and pass health checks.

## 17. Acceptance Criteria

- The complete stack starts from a clean environment with Docker Compose.
- A single administrator can sign in with a password and manage all site content through the browser.
- Tutorials support the approved block types, autosave, preview, revisions, publication, and recycle-bin recovery.
- HTML and ZIP web projects pass security validation, preview on the isolated hostname, publish atomically, and roll back.
- The public site follows the approved editorial glass design and remains readable and responsive.
- Both hostnames use HTTPS, and uploaded scripts cannot access the administration session or API data.
- Feature modules remain independently testable, expose narrow public interfaces, and pass dependency-boundary and circular-import checks.
- All repository text, database content, and HTML or JSON responses preserve UTF-8 Chinese text without corruption.
- Automated unit, integration, security, browser, visual, and accessibility tests pass.
- A documented backup can be restored successfully into a clean deployment.
