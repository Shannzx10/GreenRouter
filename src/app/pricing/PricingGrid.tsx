"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { PLANS, formatIdNumber, type Plan } from "@/lib/plans";
import { Check, Crown, Loader2, Sprout, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Grid kartu harga yang sadar sesi. Tiga keadaan penonton:
// - visitor (belum masuk): tombol mengarah ke pendaftaran.
// - pelanggan Gratis yang masuk: tombol plan berbayar membuka
//   checkout Paddle di halaman ini (customData.userId menjadi
//   jembatan ke akun, limit diterapkan webhook sesudah pembayaran).
// - pelanggan berbayar yang masuk: plan lain diganti lewat endpoint
//   ganti plan (langganan yang ada diubah, bukan checkout baru),
//   dan kartu plan yang sedang dipakai ditandai nonaktif.
export type ViewerPlan = "visitor" | "gratis" | "pro" | "max";

const RANK: Record<string, number> = { gratis: 0, pro: 1, max: 2 };

export default function PricingGrid({
  viewerPlan,
  userId,
  email,
  pricePro,
  priceMax,
}: {
  viewerPlan: ViewerPlan;
  userId: string | null;
  email: string | null;
  pricePro: string | null;
  priceMax: string | null;
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (viewerPlan !== "gratis") return;
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
        if (e.name === "checkout.error") {
          const detail = e.data as
            | { error?: { code?: string; detail?: string } }
            | undefined;
          setError(
            `Checkout gagal dibuka (${detail?.error?.code ?? "unknown"}): ${
              detail?.error?.detail ?? "coba lagi sebentar."
            }`,
          );
        }
      },
    }).then((p) => p && setPaddle(p));
  }, [viewerPlan]);

  function priceIdFor(plan: Plan): string | null {
    if (plan.id === "pro") return pricePro;
    if (plan.id === "max") return priceMax;
    return null;
  }

  function openCheckout(plan: Plan) {
    const priceId = priceIdFor(plan);
    if (!paddle || !priceId || !userId || !email) return;
    setError(null);
    setBusy(plan.id);
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

  async function changePlan(plan: Plan) {
    setError(null);
    setBusy(plan.id);
    try {
      const res = await fetch("/api/user/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Ganti plan gagal diproses.");
      setNotice(
        "Permintaan ganti plan terkirim. Kuota barumu aktif dalam beberapa saat, halaman ini akan dimuat ulang.",
      );
      window.setTimeout(() => window.location.reload(), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ganti plan gagal diproses.");
    } finally {
      setBusy(null);
    }
  }

  function actionFor(plan: Plan, featured: boolean) {
    const btnBase =
      "mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ";
    const btnStyle = featured
      ? "btn-shine bg-lime-400 text-zinc-950 hover:bg-lime-300"
      : "glass text-zinc-100 hover:border-lime-300/40 hover:text-lime-200";

    if (viewerPlan === "visitor") {
      return (
        <Link href="/register" className={btnBase + btnStyle}>
          {plan.priceUsd > 0 ? "Daftar dan Berlangganan" : "Daftar Gratis"}
        </Link>
      );
    }
    if (plan.id === viewerPlan) {
      return (
        <span className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-lime-400/10 px-6 py-3 text-sm font-semibold text-lime-300">
          Plan Kamu Saat Ini
        </span>
      );
    }
    if (viewerPlan === "gratis") {
      return (
        <button
          type="button"
          disabled={!paddle || !priceIdFor(plan) || busy !== null}
          onClick={() => openCheckout(plan)}
          className={btnBase + btnStyle}
        >
          {busy === plan.id ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
          Berlangganan {plan.name}
        </button>
      );
    }
    if (plan.priceUsd === 0) {
      return (
        <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500">
          Turun ke Gratis dengan membatalkan langganan dari portal pelanggan di
          halaman profil.
        </p>
      );
    }
    const upgrade = RANK[plan.id] > RANK[viewerPlan];
    return (
      <>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => changePlan(plan)}
          className={btnBase + btnStyle}
        >
          {busy === plan.id ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
          {upgrade ? `Upgrade ke ${plan.name}` : `Ganti ke ${plan.name}`}
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
          Berlaku seketika, selisih harga dihitung proporsional.
        </p>
      </>
    );
  }

  return (
    <div className="mt-14">
      {notice && (
        <p className="mx-auto mb-6 flex max-w-2xl items-center gap-2 rounded-2xl border border-lime-300/25 bg-lime-400/10 px-4 py-3 text-sm text-lime-200">
          <Loader2 size={15} className="shrink-0 animate-spin" /> {notice}
        </p>
      )}
      {error && (
        <p className="mx-auto mb-6 max-w-2xl rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.id === "pro";
          const paid = plan.priceUsd > 0;
          const isCurrent = viewerPlan !== "visitor" && viewerPlan === plan.id;
          const Icon = plan.id === "pro" ? Zap : plan.id === "max" ? Crown : Sprout;
          return (
            <div
              key={plan.id}
              className={
                "relative flex flex-col rounded-3xl p-7 " +
                (featured
                  ? "border border-lime-300/40 bg-lime-300/[0.06] shadow-[0_20px_60px_-20px_rgba(163,230,53,0.35)] lg:z-10 lg:scale-[1.03]"
                  : "glass") +
                (isCurrent ? " ring-1 ring-lime-300/60" : "")
              }
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime-400 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-950">
                  Paling Populer
                </span>
              )}
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                <Icon size={20} />
              </span>
              <h2 className="mt-4 text-lg font-bold tracking-tight">{plan.name}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{plan.tagline}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-tight">
                  {paid ? `$${plan.priceUsd}` : "Rp0"}
                </span>
                <span className="text-sm text-zinc-500">/ bulan</span>
              </p>
              <p className="mt-1 h-5 text-[13px] text-zinc-500">
                {plan.priceIdrNote ? `${plan.priceIdrNote} per bulan` : "Tanpa kartu, langsung pakai"}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                  {formatIdNumber(plan.tokenLimit)} token per siklus 7 hari
                </li>
                <li className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                  {formatIdNumber(plan.requestLimitHourly)} request per jam
                </li>
                <li className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                  Akses ke seluruh katalog model
                </li>
                <li className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                  Dashboard, log pemakaian, dan dokumentasi
                </li>
              </ul>
              {actionFor(plan, featured)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
