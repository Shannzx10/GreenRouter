-- Tabel hasil tes kesehatan model otomatis (terpisah dari UsageLog).
CREATE TABLE "ModelHealthCheck" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelHealthCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModelHealthCheck_modelId_checkedAt_idx" ON "ModelHealthCheck"("modelId", "checkedAt");
