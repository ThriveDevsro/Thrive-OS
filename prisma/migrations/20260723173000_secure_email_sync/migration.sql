ALTER TABLE "EmailAccount"
  ADD COLUMN "disconnectedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "syncCursor" TEXT,
  ADD COLUMN "syncErrorCode" TEXT,
  ADD COLUMN "syncMode" TEXT NOT NULL DEFAULT 'CRM_MATCHED',
  ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "syncWindowDays" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "EmailMessage"
  ADD COLUMN "accountId" UUID,
  ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "hasAttachments" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "EmailThread"
  ADD COLUMN "accountId" UUID,
  ADD COLUMN "companyId" UUID,
  ADD COLUMN "contactId" UUID,
  ADD COLUMN "lastMessageAt" TIMESTAMP(3),
  ADD COLUMN "opportunityId" UUID;

CREATE INDEX "EmailThread_workspaceId_contactId_lastMessageAt_idx"
  ON "EmailThread"("workspaceId", "contactId", "lastMessageAt");
CREATE UNIQUE INDEX "EmailThread_workspaceId_providerId_key"
  ON "EmailThread"("workspaceId", "providerId");

ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
