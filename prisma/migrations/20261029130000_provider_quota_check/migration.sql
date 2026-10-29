-- Kemampuan khusus provider: cek sisa kuota per key sebelum request,
-- dukungan endpoint Anthropic, dan saklar sinkronisasi katalog otomatis.
ALTER TABLE "Provider" ADD COLUMN "quotaCheckUrl" TEXT;
ALTER TABLE "Provider" ADD COLUMN "supportsAnthropic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Provider" ADD COLUMN "autoSync" BOOLEAN NOT NULL DEFAULT true;
