-- DropCheckConstraint
ALTER TABLE "WebProject" DROP CONSTRAINT "WebProject_currentVersion_owner_check";

-- AddCheckConstraint
ALTER TABLE "WebProject" ADD CONSTRAINT "WebProject_currentVersion_owner_check" CHECK (
  ("currentVersionId" IS NULL AND "currentVersionProjectId" IS NULL)
  OR
  (
    "currentVersionId" IS NOT NULL
    AND "currentVersionProjectId" IS NOT NULL
    AND "currentVersionProjectId" = "id"
  )
);
