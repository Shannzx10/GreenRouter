"use client";

import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";

// Tombol Lihat Invoice per baris riwayat pembayaran. URL PDF invoice
// diminta ke server per klik (kepemilikan transaksi diperiksa di sana,
// lihat api/user/billing/invoice), lalu dibuka di tab baru langsung
// ke Paddle.
export default function InvoiceButton({ transactionId }: { transactionId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openInvoice() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/user/billing/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Invoice belum tersedia.");
      }
      window.open(data.url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice belum tersedia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={openInvoice}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-300/90 outline-none transition hover:text-lime-200 focus-visible:ring-2 focus-visible:ring-lime-300/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        Lihat Invoice
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-300">
          {error}
        </span>
      )}
    </span>
  );
}
