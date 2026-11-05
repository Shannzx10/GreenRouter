"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import OAuthButtons from "../OAuthButtons";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Pesan error dari alur OAuth (callback mengarahkan ke /login?error=...)
  const searchParams = useSearchParams();
  const [error, setError] = useState(() => searchParams.get("error") ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = (await res.json().catch(() => ({}))) as { error?: string; role?: string };
    if (res.ok) {
      router.push(d.role === "ADMIN" ? "/admin" : "/app");
      router.refresh();
    } else {
      setError(d.error ?? "Login gagal");
      setBusy(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-80px] top-[-60px] h-72 w-72 bg-emerald-500/25" />
      <div className="aurora bottom-[-80px] right-[-60px] h-72 w-72 bg-lime-400/20" style={{ animationDelay: "-7s" }} />

      <form onSubmit={submit} className="glass relative w-full max-w-sm rounded-[28px] p-7 sm:p-8">
        <div className="mb-2 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-10 w-10 shrink-0 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">
            Green<span className="text-lime-300">Router</span>
          </h1>
        </div>
        <p className="mb-6 text-sm text-zinc-400">Masuk ke akunmu untuk mengelola key & pemakaian.</p>

        <label className="mb-1.5 block text-sm text-zinc-300">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60"
          placeholder="kamu@email.com"
        />
        <label className="mb-1.5 block text-sm text-zinc-300">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60"
          placeholder="••••••••"
        />
        {error && (
          <p className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
        >
          {busy && <Loader2 className="animate-spin" size={16} />} Masuk
        </button>
        <OAuthButtons />
        <p className="mt-5 text-center text-sm text-zinc-400">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-lime-300 hover:text-lime-200">
            Daftar
          </Link>
        </p>
      </form>
    </main>
  );
}
