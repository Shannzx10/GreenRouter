-- Cerminan tanggal efektif pembatalan terjadwal dari Paddle.
ALTER TABLE "User" ADD COLUMN "paddleCancelAt" TIMESTAMP(3);
