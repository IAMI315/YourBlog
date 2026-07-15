# 静态内容与控制台设计

## 目标

将 YourBlog 改为“静态公开站点 + 极小控制台服务”。公开页面、网页项目、媒体和搜索索引均由 Caddy 直接读取文件。Node 服务仅负责管理员认证、文件编辑、导入导出和静态发布。

此设计移除 PostgreSQL、Prisma、Redis、Labs 和备份服务。它保留以下能力：

- Notion 式块编辑器创建页面。
- HTML 文件上传和在线代码编辑。
- HTML 或 ZIP 网页项目上传。
- 页面、项目和媒体的本地文件持久化。
- 页面导入导出，媒体可选打包。
- 全站静态搜索。
- 搜索框输入管理员密码后的快捷控制台入口。
- 受密码保护的 `/admin` 常规入口。

## 范围与约束

- 单管理员、单实例部署。不会提供多人协作、跨实例写入或分布式锁。
- 公开内容必须在 Node 服务不可用时仍可由 Caddy 访问。
- 控制台密码不能出现在前端代码、搜索索引、URL 或公开静态文件中。
- 内容数据保存到程序目录下可挂载的 `data/` 目录。
- 所有文本文件使用 UTF-8。
- 已发布内容必须具备原子替换能力；发布失败不能影响旧版本。

## 运行时架构

```text
访客浏览器
  ├─ /、/pages/*、/projects/*、/media/*、/search.json
  │    └─ Caddy file_server -> data/public/
  │
  └─ /admin、/api/admin/*、/api/auth/*
       └─ Node 控制层
            ├─ 密码验证与签名 Cookie 会话
            ├─ 内容文件读写
            ├─ 导入导出
            └─ 静态生成、索引和原子发布
```

Docker Compose 仅保留两个服务：

- `app`：Node 控制层，提供管理界面与管理 API。
- `proxy`：Caddy，直接公开 `data/public/`，仅将管理和认证路由反代到 `app`。

一个名为 `site-data` 的卷挂载到 `data/`。不再运行数据库、缓存、静态实验室或备份容器。

## 文件模型

```text
data/
  content/
    pages/<slug>/page.json
    pages/<slug>/page.html
    projects/<slug>/...
    media/<content-hash>.<extension>
    manifest.json
  public/
    index.html
    pages/<slug>/index.html
    projects/<slug>/...
    media/<content-hash>.<extension>
    search.json
    manifest.json
  trash/<timestamp>/...
  work/<release-id>/...
```

`content/` 是可编辑源文件，`public/` 是唯一公开目录。内容清单记录页面标题、摘要、标签、内容类型、导航状态、发布时间、媒体引用和搜索摘要。它替代现有数据库中的元数据关系。

页面具有两种互斥内容类型：

| 类型 | 源文件 | 生成结果 |
|---|---|---|
| 块页面 | `page.json` | `public/pages/<slug>/index.html` |
| HTML 页面 | `page.html` | `public/pages/<slug>/index.html` |

网页项目直接存入 `content/projects/<slug>/`，发布时复制至 `public/projects/<slug>/`，公开地址为 `/projects/<slug>/`。

## 控制台工作流

### 页面与项目

- 块编辑器创建或更新块页面，保存源 JSON，发布时渲染 HTML。
- HTML 页面支持单文件上传和代码编辑，发布时写入页面静态目录。
- 网页项目支持 `.html` 和 `.zip`。ZIP 必须在根目录包含 `index.html`，并沿用现有安全校验：路径穿越、文件数量、解压大小和压缩比限制。
- 内容类型转换必须经明确确认：转换会创建新的源文件并将旧源文件移至 `trash/`，不静默覆盖。
- 保存草稿只更新 `content/`；发布才更新 `public/` 与搜索索引。
- 删除移动到 `trash/<timestamp>/`，控制台支持恢复。物理清理由显式“清空回收站”操作处理。

### 导入与导出

- 块页面默认导出 `.yourblog-page.json`。
- HTML 页面默认导出 `.html`。
- 网页项目导出 `.zip`。
- 勾选“包含媒体”时，页面导出为 ZIP，包含页面源、`media/` 和 `manifest.json`。
- 导入携带媒体的页面包时，控制层根据内容哈希命名媒体文件，并将块 JSON 与 HTML 中的站内媒体引用重写为新的 `/media/<filename>` 地址。已有媒体不会被覆盖。
- 不含媒体的导入保留页面内容；无法找到的媒体以显式占位状态显示。

## 搜索与认证

### 静态搜索

发布器从 `content/manifest.json` 生成 `public/search.json`。索引包含标题、摘要、标签、URL 与受限长度的纯文本正文摘要。浏览器获取索引后本地搜索，无需请求数据库或 Node。

### 管理员会话

- 配置优先读取 `ADMIN_PASSWORD_HASH`；兼容 `ADMIN_PASSWORD`，启动时仅在内存中派生验证器。
- 认证成功后签发带 `HttpOnly`、`SameSite=Strict` 属性的短期签名 Cookie；生产环境启用 `Secure`，HTTP localhost 开发模式关闭该属性。会话无状态，不写数据库。
- `/admin` 无会话时显示密码页。
- 搜索表单提交时先以 HTTPS `POST /api/auth/command` 验证输入。成功时创建会话并跳转 `/admin`；失败或服务不可用时回退至本地静态搜索。
- 搜索输入禁用自动填充，密码不会写入 URL、搜索索引或浏览器搜索页面状态。
- 单实例内存限流限制认证失败次数。服务重启后清空，符合无数据库约束。

## 原子发布与错误处理

发布在 `data/work/<release-id>/` 中完成：复制或渲染所有目标文件、生成清单与索引、校验路径和媒体引用。只有完整成功后才以目录级原子替换更新 `data/public/`。

- 发布失败：删除工作目录，继续服务前一公开版本。
- 导入失败：不创建或修改公开文件；控制台返回格式、路径、大小或媒体重写错误。
- 同一时刻只允许一个写操作。控制层使用进程内发布锁；单管理员和单实例是该限制的前提。
- 未发布草稿、旧源文件和删除内容保留在 `content/` 或 `trash/`，不会被公开访问。

## 迁移

迁移分三个独立阶段：

1. **导出**：读取现有 PostgreSQL 内容、媒体和项目，写成静态内容目录与初始清单。迁移报告列出缺失媒体、重复 slug 与无法渲染的页面。
2. **验证**：在临时 `public/` 目录生成全部页面，比较文章、页面、媒体和项目数量，执行链接检查与搜索索引检查。
3. **切换**：备份现有数据库卷和 `data/`，将 Caddy 公开根切换到新的静态目录，再移除数据库与 Prisma 运行时依赖。

迁移完成前保留现有版本与数据卷，不在原分支上直接删除数据库实现。

## 测试与验收

- 单元测试：文件路径安全、清单读写、块渲染、HTML 校验、媒体引用重写、密码验证、会话签名、搜索索引、发布锁与原子替换。
- 集成测试：Caddy 只读公开目录、管理路由反代、项目静态资源、导入导出 ZIP、发布失败回滚、回收站恢复。
- 端到端测试：块页面创建和发布、HTML 页面编辑、网页项目 ZIP 上传、可选媒体导出与导入、静态搜索、搜索框快捷解锁和 `/admin` 密码入口。
- 资源验收：生产 Compose 仅包含 `app`、`proxy` 与 `site-data` 卷；不包含 PostgreSQL、Prisma、Redis、Labs 或备份服务。
