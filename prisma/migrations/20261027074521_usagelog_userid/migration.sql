-- AlterTable
ALTER TABLE "UsageLog" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "UsageLog_userId_createdAt_idx" ON "UsageLog"("userId", "createdAt");
