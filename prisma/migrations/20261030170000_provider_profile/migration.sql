-- Profil kapasitas provider untuk halaman diagnosis (diisi manual admin):
-- jenis jatah, besaran, pola reset, catatan rate limit, dan catatan bebas.
ALTER TABLE "Provider" ADD COLUMN "quotaKind" TEXT;
ALTER TABLE "Provider" ADD COLUMN "quotaAmount" TEXT;
ALTER TABLE "Provider" ADD COLUMN "quotaReset" TEXT;
ALTER TABLE "Provider" ADD COLUMN "rateLimitNote" TEXT;
ALTER TABLE "Provider" ADD COLUMN "notes" TEXT;
