"use client";

import Link from "next/link";
import OAuthButtons from "../OAuthButtons";

// Pendaftaran HANYA lewat Google/GitHub (registrasi email+password sudah dihapus).
export default function RegisterForm() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-80px] top-[-60px] h-72 w-72 bg-emerald-500/25" />
      <div className="aurora bottom-[-80px] right-[-60px] h-72 w-72 bg-lime-400/20" style={{ animationDelay: "-7s" }} />

      <div className="glass relative w-full max-w-sm rounded-[28px] p-7 sm:p-8">
        <div className="mb-2 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-10 w-10 shrink-0 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">
            Green<span className="text-lime-300">Router</span>
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-zinc-400">
          Buat akun baru, dan mulai dalam hitungan menit.
        </p>

        <OAuthButtons />

        <p className="mt-5 text-center text-sm text-zinc-400">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-lime-300 hover:text-lime-200">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
