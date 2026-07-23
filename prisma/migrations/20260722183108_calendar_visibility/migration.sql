-- CreateEnum
CREATE TYPE "MeetingVisibility" AS ENUM ('PRIVATE', 'TEAM', 'WORKSPACE');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'MEETING',
ADD COLUMN     "visibility" "MeetingVisibility" NOT NULL DEFAULT 'WORKSPACE';
