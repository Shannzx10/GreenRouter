import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan · GreenRouter",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#060806] text-zinc-100">
      {/* Latar panggung, sama seperti landing */}
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-120px] top-[-80px] h-96 w-96 bg-emerald-500/25" />
      <div className="aurora bottom-[-100px] right-[-80px] h-96 w-96 bg-lime-500/15" style={{ animationDelay: "-6s" }} />

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/leaf.png"
          alt="GreenRouter"
          className="h-16 w-16 object-contain opacity-90"
        />
        <p className="text-gradient-anim mt-8 bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-[110px] font-extrabold leading-none tracking-tight text-transparent sm:text-[150px]">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
          Alamat yang kamu tuju tidak ada, sudah dipindahkan, atau memang tidak pernah
          dibuat. Periksa lagi tautannya, atau kembali ke tempat yang pasti ada.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-7 py-3.5 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300 sm:w-auto"
          >
            <Home size={17} /> Kembali ke Beranda
          </Link>
          <Link
            href="/app"
            className="glass inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-200 sm:w-auto"
          >
            Buka Dashboard <ArrowRight size={17} />
          </Link>
        </div>
        <p className="mt-14 text-[11px] font-bold uppercase tracking-[0.42em] text-zinc-500">
          Work Fast · Work Smart
        </p>
      </div>
    </main>
  );
}
