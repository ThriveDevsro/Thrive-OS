-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "lastContactedAt" TIMESTAMP(3),
ADD COLUMN     "lastReplyAt" TIMESTAMP(3),
ADD COLUMN     "ownerId" UUID;

-- CreateIndex
CREATE INDEX "Contact_workspaceId_ownerId_status_idx" ON "Contact"("workspaceId", "ownerId", "status");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
