import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

// Kerangka bersama halaman legal (Syarat Layanan, Kebijakan Privasi,
// Kebijakan Pengembalian): panggung gelap yang sama seperti landing,
// isi dokumen di kolom baca yang sempit. Halaman-halaman ini publik
// karena ditautkan dari footer dan dipakai untuk verifikasi penjual
// di mitra pembayaran.
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen flex-1 overflow-hidden bg-[#060806] text-zinc-100">
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-120px] top-[-80px] h-96 w-96 bg-emerald-500/25" />
      <div className="aurora bottom-[-100px] right-[-80px] h-96 w-96 bg-lime-500/15" style={{ animationDelay: "-6s" }} />

      <div className="relative mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:pt-14">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-lg font-bold tracking-tight">
              Green<span className="text-lime-300">Router</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-lime-200"
          >
            <ArrowLeft size={15} /> Beranda
          </Link>
        </div>

        <h1 className="mt-12 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-500">Terakhir diperbarui: 2 November 2026</p>

        <div className="mt-10 space-y-9">{children}</div>

        <p className="mt-16 border-t border-white/[0.06] pt-6 text-center text-[11px] font-bold uppercase tracking-[0.42em] text-zinc-500">
          Work Fast · Work Smart
        </p>
      </div>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-zinc-400">{children}</div>
    </section>
  );
}
