-- CreateTable
CREATE TABLE "UpstreamKeyCooldown" (
    "id" TEXT NOT NULL,
    "upstreamKeyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpstreamKeyCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpstreamKeyCooldown_until_idx" ON "UpstreamKeyCooldown"("until");

-- CreateIndex
CREATE UNIQUE INDEX "UpstreamKeyCooldown_upstreamKeyId_modelId_key" ON "UpstreamKeyCooldown"("upstreamKeyId", "modelId");

-- AddForeignKey
ALTER TABLE "UpstreamKeyCooldown" ADD CONSTRAINT "UpstreamKeyCooldown_upstreamKeyId_fkey" FOREIGN KEY ("upstreamKeyId") REFERENCES "UpstreamKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
