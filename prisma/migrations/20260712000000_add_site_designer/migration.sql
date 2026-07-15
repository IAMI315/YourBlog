-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "AppearanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'appearance',
    "themePreset" TEXT NOT NULL DEFAULT 'aurora',
    "accentPreset" TEXT NOT NULL DEFAULT 'sky',
    "backgroundTone" TEXT NOT NULL DEFAULT 'mist',
    "glassIntensity" TEXT NOT NULL DEFAULT 'balanced',
    "radiusScale" TEXT NOT NULL DEFAULT 'regular',
    "buttonStyle" TEXT NOT NULL DEFAULT 'soft',
    "headerDensity" TEXT NOT NULL DEFAULT 'standard',
    "footerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppearanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeLayoutSettings" (
    "id" TEXT NOT NULL DEFAULT 'home',
    "modules" JSONB NOT NULL,
    "heroTitle" TEXT,
    "heroDescription" TEXT,
    "featuredLabel" TEXT NOT NULL DEFAULT '精选教程',
    "labLabel" TEXT NOT NULL DEFAULT '网页实验室',
    "labTitle" TEXT NOT NULL DEFAULT '把网页项目发布到独立实验室空间',
    "labDescription" TEXT NOT NULL DEFAULT '上传 HTML/ZIP 后，后续会通过隔离域名展示。',
    "archiveLabel" TEXT NOT NULL DEFAULT '教程归档',
    "recentArticlesCount" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeLayoutSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "content" JSONB NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "showInNavigation" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coverMediaId" TEXT,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_status_publishedAt_idx" ON "Page"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Page_showInNavigation_status_idx" ON "Page"("showInNavigation", "status");

-- CreateIndex
CREATE INDEX "Page_coverMediaId_idx" ON "Page"("coverMediaId");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed a conservative visual baseline that matches the existing public style.
INSERT INTO "AppearanceSettings" (
    "id", "themePreset", "accentPreset", "backgroundTone", "glassIntensity",
    "radiusScale", "buttonStyle", "headerDensity", "footerVisible", "createdAt", "updatedAt"
) VALUES (
    'appearance', 'aurora', 'sky', 'mist', 'balanced',
    'regular', 'soft', 'standard', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Reuse existing homepage wording when a site-settings record already exists.
INSERT INTO "HomeLayoutSettings" (
    "id", "modules", "heroTitle", "heroDescription", "createdAt", "updatedAt"
)
SELECT
    'home',
    '[{"id":"hero","enabled":true},{"id":"featured","enabled":true},{"id":"recent","enabled":true},{"id":"labs","enabled":true},{"id":"archive","enabled":true}]'::jsonb,
    "homeTitle",
    "homeDescription",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "SiteSettings"
WHERE "id" = 'site';
