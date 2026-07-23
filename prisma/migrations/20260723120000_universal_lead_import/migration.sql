-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImportEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leadId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "rawPayload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ImportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportEvent_workspaceId_dedupeKey_key" ON "ImportEvent"("workspaceId", "dedupeKey");

-- CreateIndex
CREATE INDEX "ImportEvent_workspaceId_sourceName_receivedAt_idx" ON "ImportEvent"("workspaceId", "sourceName", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "ImportEvent_workspaceId_status_receivedAt_idx" ON "ImportEvent"("workspaceId", "status", "receivedAt" DESC);

-- AddForeignKey
ALTER TABLE "ImportEvent" ADD CONSTRAINT "ImportEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportEvent" ADD CONSTRAINT "ImportEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
