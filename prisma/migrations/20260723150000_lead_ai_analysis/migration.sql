CREATE TYPE "AiAnalysisStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'IGNORED',
  'APPROVED'
);

CREATE TABLE "LeadAiAnalysis" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "leadId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "status" "AiAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
  "summary" TEXT,
  "category" TEXT,
  "relevanceScore" INTEGER,
  "priority" TEXT,
  "detectedBudgetMin" DECIMAL(18,2),
  "detectedBudgetMax" DECIMAL(18,2),
  "detectedBudgetCurrency" VARCHAR(3),
  "technologies" JSONB NOT NULL DEFAULT '[]',
  "suggestedNextAction" TEXT,
  "riskFlags" JSONB NOT NULL DEFAULT '[]',
  "missingFields" JSONB NOT NULL DEFAULT '[]',
  "confidence" DOUBLE PRECISION,
  "inputHash" TEXT NOT NULL,
  "inputCharacterCount" INTEGER NOT NULL,
  "durationMs" INTEGER,
  "providerStartedAt" TIMESTAMP(3),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" UUID,
  "ignoredAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "activeJobKey" TEXT,

  CONSTRAINT "LeadAiAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadAiAnalysis_relevanceScore_check"
    CHECK ("relevanceScore" IS NULL OR ("relevanceScore" BETWEEN 0 AND 100)),
  CONSTRAINT "LeadAiAnalysis_confidence_check"
    CHECK ("confidence" IS NULL OR ("confidence" BETWEEN 0 AND 1))
);

CREATE UNIQUE INDEX "LeadAiAnalysis_activeJobKey_key"
  ON "LeadAiAnalysis"("activeJobKey");
CREATE INDEX "LeadAiAnalysis_workspaceId_createdAt_idx"
  ON "LeadAiAnalysis"("workspaceId", "createdAt" DESC);
CREATE INDEX "LeadAiAnalysis_workspaceId_providerStartedAt_idx"
  ON "LeadAiAnalysis"("workspaceId", "providerStartedAt");
CREATE INDEX "LeadAiAnalysis_leadId_createdAt_idx"
  ON "LeadAiAnalysis"("leadId", "createdAt" DESC);
CREATE INDEX "LeadAiAnalysis_leadId_inputHash_promptVersion_model_idx"
  ON "LeadAiAnalysis"("leadId", "inputHash", "promptVersion", "model");
CREATE INDEX "LeadAiAnalysis_workspaceId_createdByUserId_providerStartedAt_idx"
  ON "LeadAiAnalysis"("workspaceId", "createdByUserId", "providerStartedAt");

ALTER TABLE "LeadAiAnalysis"
  ADD CONSTRAINT "LeadAiAnalysis_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAiAnalysis"
  ADD CONSTRAINT "LeadAiAnalysis_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAiAnalysis"
  ADD CONSTRAINT "LeadAiAnalysis_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadAiAnalysis"
  ADD CONSTRAINT "LeadAiAnalysis_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
