// Panduan mekanisme per provider untuk halaman diagnosis admin. Isinya
// pengetahuan operasional yang terverifikasi (dari docs resmi provider dan
// pengamatan langsung), BUKAN tebakan: tampilkan hanya yang sudah terbukti.
// Tambahkan entri baru saat halaman diagnosis provider lain dibangun.
export type ProviderGuide = {
  mechanism: string[];
  errors: { code: string; name: string; meaning: string; handling: string }[];
};

const GUIDES: Record<string, ProviderGuide> = {
  larprouter: {
    mechanism: [
      "Dua kantong terpisah: saldo berbayar dan Free Allowance. Saldo berbayar akun saat ini $0,00, jadi pemakaian bertumpu pada allowance.",
      "Free Allowance 2.000.000 token dan reset berkala (harian). Hanya model yang tercakup allowance yang memotong jatah ini; model di luar cakupan membalas 402.",
      "Setiap key terikat pool yang dipilih saat key dibuat (Claude / Gemini / DeepSeek-GLM / Grok). GET /models per key hanya berisi model pool-nya, jadi model bisa tampil di dashboard LarpRouter tapi tidak tersedia untuk key kita, contohnya clef-flash yang membalas 400 model_unpriced_or_unavailable.",
      "Satu model di luar allowance yang membalas 402 menandai SELURUH key sebagai LIMITED di GreenRouter, termasuk untuk model yang sehat. Periksa model pemicunya di bagian Error Terakhir sebelum mengaktifkan key lagi.",
      "Angka rate limit tidak dipublikasikan; sinyalnya 429 plus header Retry-After. GreenRouter memperlakukan 429 sebagai masa tunggu, bukan key mati.",
      "GET /models per key TIDAK otoritatif untuk ketersediaan chat: daftarnya hanya memuat 4 model (deepseek-v4.1-flash-1017-abliterated, deepseek-v4.1-flash-1017-non-abliterated, glm-5.3, qwen3.8-27b-non-abliterated), sedangkan deepseek-v4.1-flash dan glm-5.3-flash tidak tampil di daftar tapi melayani chat. Hasil chat per route di Diagnosis Langsung adalah bukti yang menentukan, bukan daftar pool.",
    ],
    errors: [
      {
        code: "401",
        name: "authentication_error",
        meaning: "Key tidak sah, salah, atau dicabut.",
        handling: "Key ditandai DISABLED permanen. Periksa atau ganti key, lalu aktifkan kembali dari halaman ini.",
      },
      {
        code: "402",
        name: "insufficient_credit",
        meaning: "Saldo berbayar kosong dan model tidak tercakup allowance, atau allowance periode ini habis.",
        handling: "Key ditandai LIMITED dan keluar rotasi sampai diaktifkan manual. Cek model pemicunya di Error Terakhir; bila allowance sudah reset, key aman diaktifkan lagi.",
      },
      {
        code: "409",
        name: "request_replay",
        meaning: "Request yang sama sudah pernah diproses sebelumnya.",
        handling: "Dijawab langsung ke klien tanpa failover. Key tidak ditandai apa pun.",
      },
      {
        code: "429",
        name: "too_many_requests",
        meaning: "Rate limit tercapai; terlalu banyak request dalam waktu singkat.",
        handling: "Key tetap ACTIVE dan masuk masa tunggu sesuai Retry-After hulu (bawaan 60 detik, maks 300 detik), dilewati rotasi selama itu, lalu pulih sendiri. Bukan LIMITED.",
      },
      {
        code: "503",
        name: "service_unavailable",
        meaning: "Layanan LarpRouter sendiri sedang terganggu.",
        handling: "Failover ke key berikutnya; bila semua kandidat gagal, klien menerima pesan pemeliharaan sementara per model dari GreenRouter.",
      },
      {
        code: "400",
        name: "model_unpriced_or_unavailable",
        meaning: "Model tidak tersedia di pool key ini (teramati di lapangan, tidak ada di daftar error resmi).",
        handling: "Dijawab sebagai error request ke klien, key tidak ditandai. Model seperti ini jangan dimasukkan katalog untuk pool key kita.",
      },
    ],
  },
};

export function providerGuide(providerName: string): ProviderGuide | null {
  return GUIDES[providerName.trim().toLowerCase()] ?? null;
}
