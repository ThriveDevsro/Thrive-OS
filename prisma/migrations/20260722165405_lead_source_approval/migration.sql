-- AlterTable
ALTER TABLE "LeadSource" ADD COLUMN     "approvalConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "approvalConfirmedBy" UUID;
