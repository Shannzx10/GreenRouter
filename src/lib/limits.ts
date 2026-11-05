// Konstanta batas akun, sengaja ditaruh di modul yang murni data:
// modul ini diimpor baik oleh kode server (quota, oauth, webhook)
// maupun komponen klien (grid harga), jadi tidak boleh menarik
// dependensi server apa pun seperti Prisma.

// Kuota token per SIKLUS: jendela 7 hari berjangkar pada tanggal akun
// dibuat (createdAt). Siklus bergulir otomatis, tanpa cron/penjadwal:
// jendela selalu dihitung dari waktu saat ini (lihat lib/quota).
export const DEFAULT_TOKEN_LIMIT = 5_000_000;
export const DEFAULT_REQUEST_LIMIT_HOURLY = 300;
export const CYCLE_DAYS = 7;
