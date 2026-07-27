CREATE TABLE "ExtensionToken" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtensionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExtensionToken_tokenHash_key" ON "ExtensionToken"("tokenHash");
CREATE INDEX "ExtensionToken_userId_expiresAt_idx" ON "ExtensionToken"("userId", "expiresAt");

ALTER TABLE "ExtensionToken"
  ADD CONSTRAINT "ExtensionToken_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExtensionToken"
  ADD CONSTRAINT "ExtensionToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
