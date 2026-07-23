ALTER TABLE "AIConversation"
  ADD COLUMN "contextId" TEXT,
  ADD COLUMN "contextType" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AIAction"
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "resultId" TEXT,
  ADD COLUMN "resultType" TEXT,
  ADD COLUMN "userId" UUID,
  ADD COLUMN "workspaceId" UUID;

UPDATE "AIAction" AS action
SET
  "userId" = conversation."userId",
  "workspaceId" = conversation."workspaceId"
FROM "AIConversation" AS conversation
WHERE action."conversationId" = conversation."id";

ALTER TABLE "AIAction"
  ALTER COLUMN "userId" SET NOT NULL,
  ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE TABLE "AIMessage" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiUsageEvent" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIMessage_conversationId_createdAt_idx"
  ON "AIMessage"("conversationId", "createdAt");
CREATE INDEX "AIMessage_workspaceId_userId_createdAt_idx"
  ON "AIMessage"("workspaceId", "userId", "createdAt");
CREATE INDEX "AIAction_workspaceId_userId_status_idx"
  ON "AIAction"("workspaceId", "userId", "status");
CREATE INDEX "AIConversation_workspaceId_userId_updatedAt_idx"
  ON "AIConversation"("workspaceId", "userId", "updatedAt");
CREATE INDEX "AiUsageEvent_workspaceId_startedAt_idx"
  ON "AiUsageEvent"("workspaceId", "startedAt");
CREATE INDEX "AiUsageEvent_workspaceId_userId_startedAt_idx"
  ON "AiUsageEvent"("workspaceId", "userId", "startedAt");

ALTER TABLE "EmailAccount"
  ADD CONSTRAINT "EmailAccount_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailAccount"
  ADD CONSTRAINT "EmailAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIConversation"
  ADD CONSTRAINT "AIConversation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIConversation"
  ADD CONSTRAINT "AIConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIAction"
  ADD CONSTRAINT "AIAction_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIAction"
  ADD CONSTRAINT "AIAction_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIAction"
  ADD CONSTRAINT "AIAction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIMessage"
  ADD CONSTRAINT "AIMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIMessage"
  ADD CONSTRAINT "AIMessage_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIMessage"
  ADD CONSTRAINT "AIMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent"
  ADD CONSTRAINT "AiUsageEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent"
  ADD CONSTRAINT "AiUsageEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
