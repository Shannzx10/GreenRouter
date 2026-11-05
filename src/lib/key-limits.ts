// Validasi batas token per key (fitur plan Max): hanya plan Max
// yang boleh memasang batas, nilainya bilangan bulat positif.
// Mengembalikan angka batas, null (tanpa batas), atau pesan error.
// Dipakai route pembuatan key dan route ubah key.
export function parseKeyTokenLimit(
  value: unknown,
  plan: string,
): { limit: number | null } | { error: string } {
  if (value === undefined) return { limit: null };
  if (value === null) return { limit: null };
  if (plan !== "max") {
    return { error: "Batas pemakaian per key hanya tersedia di plan Max" };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || Math.round(n) !== n) {
    return { error: "Batas token key harus bilangan bulat positif" };
  }
  return { limit: n };
}
