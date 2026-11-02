"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Tombol-tombol plan di halaman Profil. Checkout dibuka sebagai
// overlay Paddle.js dengan customData.userId sebagai jembatan ke akun
// GreenRouter; limit akun TIDAK berubah di sini, melainkan oleh
// webhook langganan (server/paddle-events) sesudah pembayaran
// terkonfirmasi. Untuk pelanggan yang sudah berlangganan, tombol
// Kelola Langganan menukar sesi portal pelanggan lewat API kita.
export default function PlanActions({
  userId,
  email,
  plan,
  pricePro,
  priceMax,
}: {
  userId: string;
  email: string;
  plan: string;
  pricePro: string | null;
  priceMax: string | null;
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
    if (!token || !env) return;
    initializePaddle({
      token,
      environment: env as "sandbox" | "production",
      eventCallback: (e) => {
        if (e.name === "checkout.completed") {
          setNotice(
            "Pembayaran diterima. Plan barumu aktif dalam beberapa saat, halaman ini akan dimuat ulang.",
          );
          window.setTimeout(() => window.location.reload(), 3000);
        }
      },
    }).then((p) => p && setPaddle(p));
  }, []);

  function openCheckout(priceId: string | null, label: string) {
    if (!paddle || !priceId) return;
    setError(null);
    setBusy(label);
    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email },
        customData: { userId },
        settings: {
          variant: "one-page",
          successUrl: `${window.location.origin}/app/profile`,
        },
      });
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setError(null);
    setBusy("portal");
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
      setBusy(null);
    }
  }

  if (notice) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-2xl border border-lime-300/25 bg-lime-400/10 px-4 py-3 text-sm text-lime-200">
        <Loader2 size={15} className="animate-spin" /> {notice}
      </p>
    );
  }

  return (
    <div className="mt-5">
      {plan === "gratis" ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!paddle || !pricePro || busy !== null}
            onClick={() => openCheckout(pricePro, "pro")}
            className="btn-shine inline-flex items-center justify-center rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "pro" ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
            Berlangganan Pro, $9 per bulan
          </button>
          <button
            type="button"
            disabled={!paddle || !priceMax || busy !== null}
            onClick={() => openCheckout(priceMax, "max")}
            className="glass inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "max" ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
            Berlangganan Max, $24 per bulan
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={openPortal}
          className="glass inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "portal" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <ExternalLink size={15} />
          )}
          Kelola Langganan
        </button>
      )}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Pembayaran aman melalui Paddle. Langganan diperpanjang otomatis dan
        dapat dibatalkan kapan saja dari portal pelanggan.
      </p>
    </div>
  );
}
