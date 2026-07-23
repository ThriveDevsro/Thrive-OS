ALTER TABLE "AutomationRun"
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "eventType" TEXT;

UPDATE "AutomationRun"
SET
  "eventId" = "id"::text,
  "eventType" = 'legacy';

ALTER TABLE "AutomationRun"
  ALTER COLUMN "eventId" SET NOT NULL,
  ALTER COLUMN "eventType" SET NOT NULL;

CREATE UNIQUE INDEX "AutomationRun_automationId_eventId_key"
  ON "AutomationRun"("automationId", "eventId");
CREATE INDEX "AutomationRun_automationId_startedAt_idx"
  ON "AutomationRun"("automationId", "startedAt");
