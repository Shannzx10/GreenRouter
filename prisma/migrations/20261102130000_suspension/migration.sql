-- Suspend akun menggantikan nonaktifkan: status + alasan di User,
-- dan tabel Blacklist untuk email hasil purge yang dilarang daftar lagi.
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendReason" TEXT;

CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Blacklist_email_key" ON "Blacklist"("email");
