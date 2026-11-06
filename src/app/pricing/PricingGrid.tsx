"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { PLANS, formatIdNumber, type Plan } from "@/lib/plans";
import { AlertTriangle, Check, CheckCircle2, Crown, Loader2, RefreshCcw, Settings2, Sprout, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Spot } from "../landing/Interactive";

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

export type PlanPrices = { monthly: string | null; yearly: string | null };

export default function PricingGrid({
  viewerPlan,
  userId,
  email,
  prices,
}: {
  viewerPlan: ViewerPlan;
  userId: string | null;
  email: string | null;
  prices: { pro: PlanPrices; max: PlanPrices };
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  // Ganti plan berjalan lewat popup konfirmasi: fase popup adalah
  // confirm (menunggu ya/tidak), busy (permintaan diproses), done
  // (berhasil), dan failed (gagal, pesan errornya di dalam popup).
  // Status pergantian TIDAK lagi ditampilkan sebagai banner di
  // atas grid.
  const [changeTarget, setChangeTarget] = useState<Plan | null>(null);
  const [changePhase, setChangePhase] = useState<"confirm" | "busy" | "done" | "failed">("confirm");
  const [changeMsg, setChangeMsg] = useState("");

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
    if (plan.id === "pro") return prices.pro[interval];
    if (plan.id === "max") return prices.max[interval];
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

  function askChange(plan: Plan) {
    setChangeTarget(plan);
    setChangePhase("confirm");
    setChangeMsg("");
  }

  async function confirmChange() {
    if (!changeTarget) return;
    setChangePhase("busy");
    try {
      const res = await fetch("/api/user/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: changeTarget.id }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Ganti plan gagal diproses.");
      setChangePhase("done");
    } catch (e) {
      setChangeMsg(e instanceof Error ? e.message : "Ganti plan gagal diproses.");
      setChangePhase("failed");
    }
  }

  function closeChange(reload: boolean) {
    if (changePhase === "busy") return;
    setChangeTarget(null);
    if (reload) window.location.reload();
  }

  function actionFor(plan: Plan, featured: boolean) {
    const btnBase =
      "mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ";
    const btnStyle = featured
      ? "btn-shine bg-lime-400 text-zinc-950 hover:bg-lime-300"
      : "border border-white/15 bg-white/[0.03] text-zinc-100 hover:border-lime-300/50 hover:text-lime-200";

    if (viewerPlan === "visitor") {
      return (
        <Link href="/register" className={btnBase + btnStyle}>
          {plan.priceIdrMonthly > 0 ? "Daftar dan Berlangganan" : "Daftar Gratis"}
        </Link>
      );
    }
    if (plan.id === viewerPlan) {
      return (
        <span className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-lime-300/30 bg-lime-400/10 px-6 py-3 text-sm font-semibold text-lime-300">
          <Check size={15} /> Plan Kamu Saat Ini
        </span>
      );
    }
    if (viewerPlan === "gratis") {
      const ready = !!priceIdFor(plan);
      return (
        <>
          <button
            type="button"
            disabled={!paddle || !ready || busy !== null}
            onClick={() => openCheckout(plan)}
            className={btnBase + btnStyle}
          >
            {busy === plan.id ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
            Berlangganan {plan.name}
          </button>
          {!ready && (
            <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
              Checkout untuk plan ini belum tersedia.
            </p>
          )}
        </>
      );
    }
    if (plan.id === "gratis") {
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
          onClick={() => askChange(plan)}
          className={btnBase + btnStyle}
        >
          {upgrade ? `Upgrade ke ${plan.name}` : `Ganti ke ${plan.name}`}
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
          Berlaku seketika, selisih harga dihitung proporsional.
        </p>
      </>
    );
  }

  const loggedIn = viewerPlan !== "visitor";

  return (
    <div className="mt-12">
      {loggedIn && (
        <div className="mx-auto mb-8 flex max-w-3xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="text-zinc-500">Masuk sebagai</p>
            <p className="truncate font-medium text-zinc-100">{email}</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="rounded-full border border-lime-300/30 bg-lime-400/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-lime-300">
              Plan {planLabel(viewerPlan)}
            </span>
            <Link
              href="/app/profile"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition hover:text-lime-200"
            >
              <Settings2 size={15} /> Kelola
            </Link>
          </div>
        </div>
      )}
      <div aria-live="polite">
        {notice && (
          <p className="mx-auto mb-6 flex max-w-2xl items-center gap-2 rounded-2xl border border-lime-300/25 bg-lime-400/10 px-4 py-3 text-sm text-lime-200">
            <Loader2 size={15} className="shrink-0 animate-spin" /> {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mx-auto mb-6 max-w-2xl rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="mb-10 flex justify-center">
        <div role="tablist" aria-label="Periode penagihan" className="relative grid w-full max-w-xs grid-cols-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <span
            aria-hidden
            className={
              "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-lime-400 shadow-[0_6px_24px_-6px_rgba(163,230,53,0.7)] transition-transform duration-300 ease-out " +
              (interval === "yearly" ? "translate-x-full" : "")
            }
          />
          {(["monthly", "yearly"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={interval === k}
              onClick={() => setInterval(k)}
              className={
                "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors " +
                (interval === k ? "text-zinc-950" : "text-zinc-300 hover:text-lime-200")
              }
            >
              {k === "monthly" ? "Bulanan" : "Tahunan"}
              {k === "yearly" && (
                <span className={"rounded-full px-1.5 py-0.5 text-[10px] font-bold " + (interval === "yearly" ? "bg-zinc-950/15" : "bg-lime-400/15 text-lime-300")}>
                  -11%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const featured = plan.id === "pro";
          const paid = plan.priceIdrMonthly > 0;
          const yearly = interval === "yearly";
          const perMonth = paid ? (yearly ? Math.round(plan.priceIdrYearly / 12) : plan.priceIdrMonthly) : 0;
          const saving = plan.priceIdrMonthly * 12 - plan.priceIdrYearly;
          const isCurrent = loggedIn && viewerPlan === plan.id;
          const Icon = plan.id === "pro" ? Zap : plan.id === "max" ? Crown : Sprout;
          return (
            <Spot
              key={plan.id}
              className={
                "flex flex-col rounded-3xl p-6 sm:p-7 " +
                (featured ? "plan-hot shadow-[0_20px_70px_-25px_rgba(163,230,53,0.4)] " : "") +
                (isCurrent ? "ring-1 ring-lime-300/60" : "")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                  <Icon size={20} />
                </span>
                {featured && (
                  <span className="rounded-full bg-lime-400 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-950">
                    Paling Populer
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight">{plan.name}</h2>
              <p className="mt-1.5 min-h-[2.75rem] text-sm leading-relaxed text-zinc-400">{plan.tagline}</p>
              <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[44px] font-extrabold leading-none tracking-tight">
                  {paid ? `Rp${formatIdNumber(perMonth)}` : "Rp0"}
                </span>
                <span className="text-sm text-zinc-500">/ bulan</span>
                {paid && yearly && (
                  <span className="text-sm text-zinc-600 line-through">Rp{formatIdNumber(plan.priceIdrMonthly)}</span>
                )}
              </p>
              <p className="mt-2 min-h-[2.5rem] text-[13px] leading-snug text-zinc-500">
                {!paid
                  ? "Tanpa kartu, langsung pakai"
                  : !yearly
                    ? "Ditagih bulanan, sudah termasuk pajak"
                    : `Ditagih Rp${formatIdNumber(plan.priceIdrYearly)} per tahun, sudah termasuk pajak. Hemat Rp${formatIdNumber(saving)}.`}
              </p>
              <ul className="mt-5 flex-1 space-y-3 border-t border-white/[0.07] pt-5 text-sm text-zinc-300">
                <li className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                  {formatIdNumber(plan.tokenLimit)} token per siklus 7 hari
                </li>
                <li className="flex gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                  {formatIdNumber(plan.requestLimitHourly)} request per jam
                </li>
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                    {f}
                  </li>
                ))}
              </ul>
              {actionFor(plan, featured)}
            </Spot>
          );
        })}
      </div>

      {changeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => closeChange(changePhase === "done")}
        >
          <div
            className="glass w-full max-w-sm rounded-3xl p-5"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {changePhase === "confirm" && (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                  <RefreshCcw size={19} />
                </span>
                <h2 className="mt-3.5 text-base font-semibold">
                  {RANK[changeTarget.id] > RANK[viewerPlan] ? "Upgrade" : "Ganti"} ke Plan{" "}
                  {changeTarget.name}?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  Berlaku seketika, selisih harga dihitung proporsional dan ditagih ke
                  metode pembayaran tersimpan. Interval penagihanmu tetap mengikuti
                  langganan yang berjalan. Kuota barumu{" "}
                  {formatIdNumber(changeTarget.tokenLimit)} token per siklus dan{" "}
                  {formatIdNumber(changeTarget.requestLimitHourly)} request per jam.
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => closeChange(false)}
                    className="flex-1 rounded-full border border-white/[0.12] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmChange}
                    className="btn-shine flex-1 rounded-full bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
                  >
                    Ya, Ganti Plan
                  </button>
                </div>
              </>
            )}
            {changePhase === "busy" && (
              <div className="py-4 text-center">
                <Loader2 size={28} className="mx-auto animate-spin text-lime-300" />
                <p className="mt-3 text-sm text-zinc-300">Memproses pergantian plan...</p>
                <p className="mt-1 text-xs text-zinc-500">Sebentar, jangan tutup halaman ini.</p>
              </div>
            )}
            {changePhase === "done" && (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                  <CheckCircle2 size={19} />
                </span>
                <h2 className="mt-3.5 text-base font-semibold">Plan berhasil diganti</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  Planmu sekarang {changeTarget.name}. Kuota dan batas baru diterapkan
                  dalam beberapa saat, halaman akan dimuat ulang saat kamu menutup popup
                  ini.
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => closeChange(true)}
                    className="btn-shine w-full rounded-full bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
                  >
                    Selesai
                  </button>
                </div>
              </>
            )}
            {changePhase === "failed" && (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400/10 text-red-300 ring-1 ring-red-300/25">
                  <AlertTriangle size={19} />
                </span>
                <h2 className="mt-3.5 text-base font-semibold">Ganti plan gagal</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{changeMsg}</p>
                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => closeChange(false)}
                    className="flex-1 rounded-full border border-white/[0.12] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05]"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangePhase("confirm")}
                    className="btn-shine flex-1 rounded-full bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
                  >
                    Coba Lagi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function planLabel(p: ViewerPlan): string {
  return p === "visitor" ? "" : PLANS.find((x) => x.id === p)?.name ?? p;
}
