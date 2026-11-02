"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

// Pertanyaan umum seputar plan dan penagihan. Jawaban ditulis dari
// perilaku produk yang sebenarnya: kuota per siklus 7 hari, penagihan
// bulanan lewat Paddle, ganti plan berprorasi, batal kapan saja.
const FAQS = [
  {
    q: "Bagaimana siklus kuota bekerja?",
    a: "Kuota token berjalan per siklus 7 hari yang dimulai sejak akunmu dibuat, dan terisi penuh lagi secara otomatis setiap siklus berganti. Penagihan langganan berjalan terpisah per bulan, jadi tanggal isi ulang kuota dan tanggal tagihanmu bisa berbeda.",
  },
  {
    q: "Apa yang terjadi kalau kuotaku habis?",
    a: "API akan menolak request baru sampai siklus berikutnya dimulai. Kamu bisa menunggu siklus berganti, atau naik plan kapan saja dan kuota yang lebih besar langsung berlaku tanpa menunggu.",
  },
  {
    q: "Bagaimana cara membayar plan berbayar?",
    a: "Pembayaran diproses oleh Paddle, menerima kartu, PayPal, Apple Pay, dan Google Pay. Harga dalam dolar AS; pajak yang berlaku di wilayahmu dihitung dan ditampilkan saat pembayaran, sebelum kamu menyetujui apa pun.",
  },
  {
    q: "Bisakah saya membatalkan langganan kapan saja?",
    a: "Bisa. Batalkan dari portal pelanggan yang tertaut di halaman profilmu, tanpa pertanyaan dan tanpa penalti. Plan berbayarmu tetap aktif sampai akhir periode yang sudah dibayar, sesudah itu akun kembali ke plan Gratis.",
  },
  {
    q: "Apa yang terjadi saat saya ganti plan di tengah periode?",
    a: "Selisih harganya dihitung secara proporsional dari sisa periode berjalan dan ditagih seketika ke metode pembayaran yang tersimpan. Kuota mengikuti plan baru segera sesudahnya, dan tidak ada langganan kedua yang terbentuk.",
  },
];

export default function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto mt-20 max-w-3xl sm:mt-24">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Pertanyaan yang sering diajukan
      </h2>
      <div className="mt-8 space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="glass overflow-hidden rounded-3xl">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-semibold">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-lime-300 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-sm leading-relaxed text-zinc-400">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
