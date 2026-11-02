import { prisma } from "./db";

// Akun tersuspend dihapus permanen bila admin tidak membatalkan suspend
// dalam jangka ini (dihitung sejak suspendedAt).
export const SUSPEND_TTL_MS = 3 * 24 * 3600 * 1000;

export function suspendDeadline(suspendedAt: Date): Date {
  return new Date(suspendedAt.getTime() + SUSPEND_TTL_MS);
}

// Apakah email ini dilarang mendaftar lagi (hasil purge akun tersuspend)?
export async function isBlacklisted(email: string): Promise<boolean> {
  const row = await prisma.blacklist.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return row !== null;
}

// Hapus permanen semua akun yang masa suspendnya sudah lewat: email masuk
// Blacklist dulu (tidak bisa daftar lagi), lalu key dihapus, lalu akunnya.
// Mengembalikan jumlah akun yang dipurge. Dipanggil berkala oleh watchdog
// lewat scripts/purge-suspended.ts.
export async function purgeExpiredSuspensions(): Promise<number> {
  const cutoff = new Date(Date.now() - SUSPEND_TTL_MS);
  const expired = await prisma.user.findMany({
    where: { suspendedAt: { not: null, lte: cutoff } },
    select: { id: true, email: true, suspendReason: true },
  });
  for (const u of expired) {
    await prisma.blacklist.upsert({
      where: { email: u.email.toLowerCase() },
      create: {
        email: u.email.toLowerCase(),
        reason: u.suspendReason ?? "Suspend kedaluwarsa tanpa pembatalan admin",
      },
      update: {},
    });
    // Sama seperti penghapusan manual admin: key dihapus dulu, log tetap
    // tersimpan sebagai riwayat (key menjadi null, userId tetap tercatat).
    await prisma.apiKey.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
  return expired.length;
}
