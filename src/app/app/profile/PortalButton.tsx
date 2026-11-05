"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

// Tombol Kelola Langganan di halaman Profil. Membeli dan mengganti
// plan terjadi di halaman harga; di sini pelanggan yang sudah
// berlangganan hanya mengelola langganannya (metode pembayaran,
// invoice, pembatalan) lewat portal resmi Paddle. URL portal dibuat
// server per klik sesudah sesi diperiksa, lihat
// api/user/billing/portal.
export default function PortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/user/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Portal pelanggan belum tersedia.");
      }
      window.open(data.url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal pelanggan belum tersedia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={openPortal}
        className="inline-flex border border-white/15 bg-white/[0.03] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
        Kelola Langganan
      </button>
      {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
    </span>
  );
}
