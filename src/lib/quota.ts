import { prisma } from "@/lib/db";

// Kuota token per SIKLUS: jendela 7 hari berjangkar pada tanggal akun dibuat
// (createdAt). Siklus bergulir otomatis — begitu jendela lewat, pemakaian
// dihitung dari nol lagi untuk jendela berikutnya. Tanpa cron/penjadwal:
// jendela selalu dihitung dari waktu saat ini.
export const DEFAULT_TOKEN_LIMIT = 5_000_000;
export const DEFAULT_REQUEST_LIMIT_HOURLY = 300;
export const CYCLE_DAYS = 7;

const HOUR_MS = 3600 * 1000;

// Pemakaian request per jam: jendela BERGESER 60 menit ke belakang, dihitung
// per akun dari kolom userId permanen di UsageLog (pola anti-akalan yang
// sama seperti kuota token). Semua request yang diteruskan dihitung, sukses
// maupun gagal, dan satu request klien selalu menghasilkan tepat satu baris
// log sehingga percobaan internal gateway tidak menggandakan hitungan.
export async function hourlyRequestsUsed(
  userId: string,
): Promise<{ count: number; retryAfterSec: number | null }> {
  const now = new Date();
  const since = new Date(now.getTime() - HOUR_MS);
  const where = { userId, createdAt: { gt: since } };
  const count = await prisma.usageLog.count({ where });
  if (count === 0) return { count, retryAfterSec: null };
  const oldest = await prisma.usageLog.findFirst({
    where,
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const retryAfterSec = oldest
    ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + HOUR_MS - now.getTime()) / 1000))
    : null;
  return { count, retryAfterSec };
}

const CYCLE_MS = CYCLE_DAYS * 24 * 3600 * 1000;

export type CycleWindow = { start: Date; end: Date; index: number };

export function cycleWindow(anchor: Date, now = new Date()): CycleWindow {
  const elapsed = now.getTime() - anchor.getTime();
  const index = Math.max(0, Math.floor(elapsed / CYCLE_MS));
  const start = new Date(anchor.getTime() + index * CYCLE_MS);
  const end = new Date(start.getTime() + CYCLE_MS);
  return { start, end, index };
}

export async function cycleTokensUsed(
  userId: string,
  anchor: Date,
): Promise<{ used: number; window: CycleWindow }> {
  const window = cycleWindow(anchor);
  // Dihitung dari kolom userId permanen di UsageLog — BUKAN lewat relasi key.
  // Menghapus key tidak menghapus hitungan (relasi key SetNull), jadi kuota
  // tidak bisa diakali dengan gonta-ganti key.
  const agg = await prisma.usageLog.aggregate({
    _sum: { totalTokens: true },
    where: {
      status: "SUCCESS",
      createdAt: { gte: window.start, lt: window.end },
      userId,
    },
  });
  return { used: agg._sum.totalTokens ?? 0, window };
}

export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtResetIn(end: Date, now = new Date()): string {
  const ms = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} hari lagi`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} jam lagi`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins} menit lagi`;
}
