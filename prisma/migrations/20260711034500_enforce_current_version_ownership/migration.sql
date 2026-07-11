-- DropForeignKey
ALTER TABLE "WebProject" DROP CONSTRAINT "WebProject_currentVersionId_fkey";

-- AlterTable
ALTER TABLE "WebProject" ADD COLUMN "currentVersionProjectId" TEXT;

-- BackfillCurrentVersionOwner
UPDATE "WebProject" AS project
SET "currentVersionProjectId" = version."projectId"
FROM "WebProjectVersion" AS version
WHERE project."currentVersionId" = version."id";

-- CreateIndex
CREATE UNIQUE INDEX "WebProject_currentVersionId_currentVersionProjectId_key" ON "WebProject"("currentVersionId", "currentVersionProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "WebProjectVersion_id_projectId_key" ON "WebProjectVersion"("id", "projectId");

-- AddForeignKey
ALTER TABLE "WebProject" ADD CONSTRAINT "WebProject_currentVersionId_currentVersionProjectId_fkey" FOREIGN KEY ("currentVersionId", "currentVersionProjectId") REFERENCES "WebProjectVersion"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "WebProject" ADD CONSTRAINT "WebProject_currentVersion_owner_check" CHECK (
  ("currentVersionId" IS NULL AND "currentVersionProjectId" IS NULL)
  OR
  ("currentVersionId" IS NOT NULL AND "currentVersionProjectId" = "id")
);
