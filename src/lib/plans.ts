import { DEFAULT_REQUEST_LIMIT_HOURLY, DEFAULT_TOKEN_LIMIT } from "@/lib/quota";

// Definisi plan GreenRouter, satu-satunya sumber angka untuk halaman
// harga publik dan (kelak) pemetaan langganan Paddle ke limit akun.
// Plan Gratis memakai konstanta bawaan dari quota.ts agar tidak drift.
// Langganan ditagih bulanan; limit token tetap berjalan per siklus
// 7 hari seperti di quota.ts, hanya angkanya yang lebih besar.
export type Plan = {
  id: "gratis" | "pro" | "max";
  name: string;
  tagline: string;
  priceUsd: number; // 0 = gratis; harga bulanan sebelum pajak
  priceIdrNote: string | null; // perkiraan rupiah, teks siap tampil
  tokenLimit: number; // per siklus 7 hari
  requestLimitHourly: number;
};

export const PLANS: Plan[] = [
  {
    id: "gratis",
    name: "Gratis",
    tagline: "Untuk mencoba dan membangun hal kecil.",
    priceUsd: 0,
    priceIdrNote: null,
    tokenLimit: DEFAULT_TOKEN_LIMIT,
    requestLimitHourly: DEFAULT_REQUEST_LIMIT_HOURLY,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Untuk pemakaian harian dan agen pemrograman.",
    priceUsd: 9,
    priceIdrNote: "sekitar Rp150.000",
    tokenLimit: 25_000_000,
    requestLimitHourly: 600,
  },
  {
    id: "max",
    name: "Max",
    tagline: "Kuota terbesar untuk beban kerja produksi.",
    priceUsd: 24,
    priceIdrNote: "sekitar Rp400.000",
    tokenLimit: 75_000_000,
    requestLimitHourly: 1200,
  },
];

export function formatIdNumber(n: number): string {
  return n.toLocaleString("id-ID");
}
