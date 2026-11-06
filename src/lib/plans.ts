import { DEFAULT_REQUEST_LIMIT_HOURLY, DEFAULT_TOKEN_LIMIT } from "@/lib/limits";

// Definisi plan GreenRouter, satu-satunya sumber angka untuk halaman
// harga publik dan pemetaan langganan Paddle ke limit akun.
// Harga dikunci dari sisi bersih yang diterima pemilik (keputusan
// 3 Nov 2026): Pro bersih sekitar Rp55.000 dan Max sekitar
// Rp100.000 per bulan sesudah PPN dan potongan Paddle, sehingga
// harga tampil awal (sudah termasuk pajak) adalah Rp75.000 dan
// Rp128.000 per bulan. Paket tahunan memakai skema A: 10 kali
// harga bulanan untuk 12 bulan (hemat sekitar 17 persen).
// REVISI 6 Nov 2026 (keputusan pemilik): harga BULANAN diturunkan
// supaya tidak jomplang terhadap tarif efektif tahunan, Pro jadi
// Rp70.000 (bersih sekitar Rp51.000) dan Max jadi Rp123.000
// (bersih sekitar Rp96.000); harga tahunan TIDAK berubah
// (Rp750.000 dan Rp1.280.000, kini setara hemat sekitar 11 persen
// di Pro dan 13 persen di Max). Price bulanan Paddle diganti baru
// (Pro $3,87 dan Max $6,79); price bulanan lama ($4,15 dan $7,07)
// diarsipkan tapi tetap dikenali pemetaan lewat variabel
// PADDLE_PRICE_*_MONTHLY_LEGACY agar langganan berjalan tidak
// kehilangan plan-nya.
// Paddle TIDAK mendukung mata uang IDR untuk harga (daftar mata
// uangnya tetap), jadi harga sebenarnya di Paddle dibuat dalam
// USD yang sudah termasuk pajak dan mendekati angka rupiah ini
// pada kurs sekitar Rp18.140: Pro $3,87/bln dan $41,50/thn, Max
// $6,79/bln dan $70,70/thn (bulanan per revisi 6 Nov 2026). Angka rupiah di situs adalah
// perkiraan tampil; rupiah yang tertagih mengikuti kurs saat
// pembayaran dan bersih yang diterima ikut bergerak dengan kurs.
// Plan Gratis memakai konstanta bawaan dari limits.ts agar tidak
// drift. Limit token berjalan per siklus 7 hari seperti di
// quota.ts, hanya angkanya yang lebih besar di plan berbayar.
export type Plan = {
  id: "gratis" | "pro" | "max";
  name: string;
  tagline: string;
  priceIdrMonthly: number; // harga tampil per bulan, sudah termasuk pajak; 0 = gratis
  priceIdrYearly: number; // harga tampil per tahun, sudah termasuk pajak
  tokenLimit: number; // per siklus 7 hari
  requestLimitHourly: number;
  apiKeyLimit: number; // jumlah API key aktif maksimum
  statsDays: number; // rentang statistik pemakaian yang bisa dilihat
  features: string[]; // baris benefit tambahan di kartu harga
};

export const PLANS: Plan[] = [
  {
    id: "gratis",
    name: "Gratis",
    tagline: "Untuk mencoba dan membangun hal kecil.",
    priceIdrMonthly: 0,
    priceIdrYearly: 0,
    tokenLimit: DEFAULT_TOKEN_LIMIT,
    requestLimitHourly: DEFAULT_REQUEST_LIMIT_HOURLY,
    apiKeyLimit: 2,
    statsDays: 7,
    features: [
      "Akses ke seluruh katalog model",
      "2 API key",
      "Statistik pemakaian 7 hari",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Untuk pemakaian harian dan agen pemrograman.",
    priceIdrMonthly: 70_000,
    priceIdrYearly: 750_000,
    tokenLimit: 20_000_000,
    requestLimitHourly: 600,
    apiKeyLimit: 5,
    statsDays: 30,
    features: [
      "Akses ke seluruh katalog model",
      "5 API key",
      "Prioritas saat pool ramai",
      "Statistik pemakaian 30 hari",
      "Akses lebih awal ke model baru",
    ],
  },
  {
    id: "max",
    name: "Max",
    tagline: "Kuota terbesar untuk beban kerja produksi.",
    priceIdrMonthly: 123_000,
    priceIdrYearly: 1_280_000,
    tokenLimit: 50_000_000,
    requestLimitHourly: 1200,
    apiKeyLimit: 15,
    statsDays: 90,
    features: [
      "Akses ke seluruh katalog model",
      "15 API key, batas per key bisa diatur",
      "Prioritas tertinggi saat pool ramai",
      "Statistik pemakaian 90 hari, bisa diekspor",
      "Akses lebih awal ke model baru",
      "Dukungan prioritas",
    ],
  },
];

export function formatIdNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

export function planById(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export type BillingInterval = "monthly" | "yearly";

// Pemetaan price id Paddle ke plan. Price id berbeda per
// environment (sandbox dan live), jadi dibaca dari env:
// PADDLE_PRICE_PRO_MONTHLY, PADDLE_PRICE_PRO_YEARLY,
// PADDLE_PRICE_MAX_MONTHLY, PADDLE_PRICE_MAX_YEARLY.
// Dua variabel lama (PADDLE_PRICE_PRO, PADDLE_PRICE_MAX) adalah
// harga dolar sandbox generasi pertama; tetap dikenali supaya
// langganan lama yang masih berjalan tidak kehilangan plan-nya.
// Hal yang sama berlaku untuk price bulanan generasi Nov 2026
// ($4,15 dan $7,07) yang digantikan revisi harga 6 Nov 2026:
// id-nya disimpan di PADDLE_PRICE_PRO_MONTHLY_LEGACY dan
// PADDLE_PRICE_MAX_MONTHLY_LEGACY dan tetap dikenali di sini.
// Price yang tidak dikenal mengembalikan null.
export function planByPriceId(priceId: string | undefined | null): Plan | null {
  if (!priceId) return null;
  if (
    priceId === process.env.PADDLE_PRICE_PRO_MONTHLY ||
    priceId === process.env.PADDLE_PRICE_PRO_MONTHLY_LEGACY ||
    priceId === process.env.PADDLE_PRICE_PRO_YEARLY ||
    priceId === process.env.PADDLE_PRICE_PRO
  ) {
    return planById("pro");
  }
  if (
    priceId === process.env.PADDLE_PRICE_MAX_MONTHLY ||
    priceId === process.env.PADDLE_PRICE_MAX_MONTHLY_LEGACY ||
    priceId === process.env.PADDLE_PRICE_MAX_YEARLY ||
    priceId === process.env.PADDLE_PRICE_MAX
  ) {
    return planById("max");
  }
  return null;
}

// Interval penagihan sebuah price id, dipakai saat ganti plan agar
// pelanggan tahunan tetap tahunan dan bulanan tetap bulanan.
// Price lama tanpa akhiran interval dianggap bulanan.
export function intervalOfPriceId(priceId: string | undefined | null): BillingInterval {
  if (
    priceId &&
    (priceId === process.env.PADDLE_PRICE_PRO_YEARLY ||
      priceId === process.env.PADDLE_PRICE_MAX_YEARLY)
  ) {
    return "yearly";
  }
  return "monthly";
}

// Price id untuk checkout atau ganti plan. Hanya dipanggil dari
// sisi server (halaman harga dan route API), karena variabel env
// Paddle tidak tersedia di browser.
export function priceIdForPlan(
  planId: "pro" | "max",
  interval: BillingInterval,
): string | null {
  const name =
    planId === "pro"
      ? interval === "yearly"
        ? "PADDLE_PRICE_PRO_YEARLY"
        : "PADDLE_PRICE_PRO_MONTHLY"
      : interval === "yearly"
        ? "PADDLE_PRICE_MAX_YEARLY"
        : "PADDLE_PRICE_MAX_MONTHLY";
  return process.env[name] ?? null;
}
