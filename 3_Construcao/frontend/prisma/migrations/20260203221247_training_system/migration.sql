-- CreateEnum
CREATE TYPE "AccountActivationStatus" AS ENUM ('PENDING_DOCUMENTS', 'PENDING_TRAINING', 'TRAINING_SCHEDULED', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- DropIndex
DROP INDEX "Book_loanPolicy_idx";

-- DropIndex
DROP INDEX "Book_materialType_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activationStatus" "AccountActivationStatus" NOT NULL DEFAULT 'PENDING_DOCUMENTS';

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 20,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 120,
    "status" "TrainingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "attendedAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "certificateGeneratedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSession_trainerId_idx" ON "TrainingSession"("trainerId");

-- CreateIndex
CREATE INDEX "TrainingSession_scheduledDate_idx" ON "TrainingSession"("scheduledDate");

-- CreateIndex
CREATE INDEX "TrainingSession_status_idx" ON "TrainingSession"("status");

-- CreateIndex
CREATE INDEX "TrainingParticipant_userId_idx" ON "TrainingParticipant"("userId");

-- CreateIndex
CREATE INDEX "TrainingParticipant_sessionId_idx" ON "TrainingParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingParticipant_attended_idx" ON "TrainingParticipant"("attended");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingParticipant_userId_sessionId_key" ON "TrainingParticipant"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingParticipant" ADD CONSTRAINT "TrainingParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
