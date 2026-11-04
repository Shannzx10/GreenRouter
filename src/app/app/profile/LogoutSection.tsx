"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

export default function LogoutSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmLogout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-3xl border border-red-400/15 bg-red-500/[0.03] p-5 sm:p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/20">
          <LogOut size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Keluar</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Akhiri sesi di perangkat ini.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-red-400/30 px-5 py-2.5 text-sm font-semibold text-red-300 outline-none transition hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-300/50"
        >
          Keluar
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/20">
              <LogOut size={19} />
            </span>
            <h3 className="mt-4 text-lg font-bold">Keluar dari GreenRouter?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              Sesi di perangkat ini akan diakhiri. Kamu harus masuk lagi untuk membuka
              dashboard.
            </p>
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.04] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmLogout}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
