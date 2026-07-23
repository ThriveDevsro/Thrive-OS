-- Preserve the canonical import identity while allowing duplicate attempts to be logged.
ALTER TABLE "ImportEvent" ADD COLUMN "canonicalKey" TEXT;
UPDATE "ImportEvent" SET "canonicalKey" = "dedupeKey";
UPDATE "ImportEvent" SET "status" = 'NEW' WHERE "status" IN ('RECEIVED', 'PROCESSED');

DROP INDEX "ImportEvent_workspaceId_dedupeKey_key";
CREATE UNIQUE INDEX "ImportEvent_workspaceId_canonicalKey_key" ON "ImportEvent"("workspaceId", "canonicalKey");
CREATE INDEX "ImportEvent_workspaceId_dedupeKey_idx" ON "ImportEvent"("workspaceId", "dedupeKey");
