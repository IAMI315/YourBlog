# YourBlog

YourBlog 是一个面向个人科技教程的博客系统，包含公开博客、密码管理后台、Notion 式文章编辑、图片上传处理、独立网页/ZIP 上传、Docker Compose 部署、数据库迁移和备份恢复脚本。

## 功能概览

- Apple 风格、毛玻璃质感的公开博客页面
- 管理后台仅需管理员密码登录
- Notion 式块编辑器，适合写科技教程
- 支持文章草稿、发布、历史版本恢复、回收站
- 支持图片上传、校验和处理
- 支持上传独立 HTML/ZIP 网页项目，并通过独立 Labs 域名访问
- 使用 PostgreSQL 持久化数据
- 使用 Caddy 作为反向代理
- 使用 Docker Compose 一键部署
- 内置备份和恢复脚本

## 快速部署到服务器

服务器需要先安装：

- Docker
- Docker Compose

克隆项目：

```bash
git clone https://github.com/IAMI315/YourBlog.git
cd YourBlog
```

复制环境变量：

```bash
cp .env.example .env
```

编辑 `.env`，至少修改这些值：

```env
BLOG_HOST=blog.example.com
LABS_HOST=labs.example.com
POSTGRES_PASSWORD=change-me-please
DATABASE_URL=postgresql://blog:change-me-please@db:5432/yourblog
AUTH_SECRET=replace-with-at-least-32-random-bytes
WEB_PROJECT_UPLOAD_SECRET=replace-with-a-different-32-byte-secret
ADMIN_PASSWORD=YourBlogadmin
```

说明：

- `BLOG_HOST` 是博客域名。
- `LABS_HOST` 是网页项目展示域名，建议和博客域名分开。
- `POSTGRES_PASSWORD` 和 `DATABASE_URL` 里的密码必须一致。
- `ADMIN_PASSWORD` 是管理员登录密码，默认是 `YourBlogadmin`，正式部署前建议改掉。

启动完整服务：

```bash
docker compose --env-file .env up -d --build
```

查看状态：

```bash
docker compose --env-file .env ps
```

健康检查：

```bash
curl https://blog.example.com/api/health
```

如果你本地测试时 80/443 端口被占用，可以临时指定端口：

```powershell
$env:HTTP_PORT="32123"
$env:HTTPS_PORT="32443"
docker compose --env-file .env up -d --build
```

然后访问：

```text
http://blog.localhost:32123
```

## 管理后台

后台地址：

```text
https://你的博客域名/admin
```

默认管理员密码：

```text
YourBlogadmin
```

推荐正式部署时在 `.env` 中修改：

```env
ADMIN_PASSWORD=换成你自己的强密码
```

修改后重启 app：

```bash
docker compose --env-file .env up -d --force-recreate app
```

启动脚本会自动确保管理员密码与 `ADMIN_PASSWORD` 保持一致，并在密码变化后清空旧会话。

## 上传文章和网页项目

登录后台后：

- `/admin/articles`：管理教程文章
- `/admin/media`：管理图片素材
- `/admin/web-projects`：上传独立 HTML 或 ZIP 网页项目
- `/admin/settings`：修改站点名称、作者信息、导航和 SEO
- `/admin/backups`：查看备份说明

网页项目会发布到 Labs 服务，建议使用独立域名访问，避免管理后台 Cookie 泄露到静态项目。

## 备份和恢复

手动备份：

```powershell
pwsh ./scripts/backup.ps1
```

恢复前必须先停止生产服务，脚本会拒绝覆盖正在运行的生产栈：

```powershell
docker compose --env-file .env down
pwsh ./scripts/restore.ps1 -ArchivePath ./backups/backup-YYYYMMDD-HHMMSS
```

备份内容包括：

- PostgreSQL 数据库
- 图片媒体文件
- Labs 网页项目文件
- SHA-256 校验文件

## 本地开发：最简流程

Windows 用户推荐使用 PowerShell。

准备要求：

- Node.js `>=24.18.0 <25`
- Docker Desktop
- Git

克隆项目：

```powershell
git clone https://github.com/IAMI315/YourBlog.git
cd YourBlog
```

一键准备开发环境：

```powershell
corepack enable
corepack pnpm@11.11.0 setup:dev
```

这个命令会自动完成：

- 安装依赖
- 创建 `.env.local`
- 启动本地 PostgreSQL 测试数据库
- 执行 Prisma 数据库迁移

启动开发服务器：

```powershell
corepack pnpm@11.11.0 dev
```

访问：

```text
http://localhost:3000
```

后台：

```text
http://localhost:3000/admin
```

本地默认管理员密码：

```text
YourBlogadmin
```

## 本地测试

一键运行完整检查：

```powershell
corepack pnpm@11.11.0 verify:dev
```

它会自动：

- 启动本地测试数据库
- 执行数据库迁移
- 检查 UTF-8 编码
- 检查模块边界
- 运行 ESLint
- 运行 TypeScript 类型检查
- 运行全部单元测试和集成测试

也可以手动执行：

```powershell
corepack pnpm@11.11.0 check:utf8
corepack pnpm@11.11.0 check:boundaries
corepack pnpm@11.11.0 lint
corepack pnpm@11.11.0 typecheck
corepack pnpm@11.11.0 test
```

停止本地测试数据库：

```powershell
corepack pnpm@11.11.0 db:dev:down
```

## 常用 Docker 命令

重新构建并启动：

```bash
docker compose --env-file .env up -d --build
```

查看日志：

```bash
docker compose --env-file .env logs -f app
```

重启应用：

```bash
docker compose --env-file .env up -d --force-recreate app
```

停止服务：

```bash
docker compose --env-file .env down
```

注意：不要随意删除 Docker volume，否则会删除数据库、图片和网页项目数据。

## 项目结构

```text
src/                    应用源码
src/app/                Next.js 路由、页面和 API
src/modules/            业务模块
src/components/         UI 组件
src/infrastructure/     数据库、存储、时间等基础设施
prisma/                 数据库 schema 和迁移
scripts/                开发、迁移、备份、恢复脚本
docker/                 Caddy 和 Labs Nginx 配置
tests/                  架构和集成测试
compose.yaml            生产 Docker Compose 配置
compose.test.yaml       本地测试数据库配置
```

## GitHub 上传说明

仓库只保留源码、配置、测试和迁移文件。

这些内容不会上传：

- `node_modules/`
- `.next/`
- `.env`
- `.env.local`
- 本地数据目录
- 测试报告
- 构建缓存

clone 后通过 `corepack pnpm@11.11.0 setup:dev` 即可重新生成本地开发所需内容。
