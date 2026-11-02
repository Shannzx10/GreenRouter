import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { PLANS, formatIdNumber, type Plan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Harga · GreenRouter",
  description:
    "Plan GreenRouter: mulai gratis dengan kuota token per siklus, naik ke Pro dan Max untuk kuota yang jauh lebih besar. Satu key untuk semua model AI.",
};

function PlanCard({ plan, featured }: { plan: Plan; featured: boolean }) {
  const paid = plan.priceUsd > 0;
  return (
    <div
      className={
        "relative flex flex-col rounded-3xl p-7 " +
        (featured
          ? "border border-lime-300/40 bg-lime-300/[0.06] shadow-[0_20px_60px_-20px_rgba(163,230,53,0.35)]"
          : "glass")
      }
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime-400 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-950">
          Paling Populer
        </span>
      )}
      <h2 className="text-lg font-bold tracking-tight">{plan.name}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{plan.tagline}</p>
      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight">
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
      <Link
        href="/register"
        className={
          "mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold transition " +
          (featured
            ? "btn-shine bg-lime-400 text-zinc-950 hover:bg-lime-300"
            : "glass text-zinc-100 hover:border-lime-300/40 hover:text-lime-200")
        }
      >
        {paid ? "Daftar dan Berlangganan" : "Daftar Gratis"}
      </Link>
      {paid && (
        <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
          Plan diaktifkan dari dashboard setelah masuk.
        </p>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="relative min-h-screen flex-1 overflow-hidden bg-[#060806] text-zinc-100">
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-120px] top-[-80px] h-96 w-96 bg-emerald-500/25" />
      <div className="aurora bottom-[-100px] right-[-80px] h-96 w-96 bg-lime-500/15" style={{ animationDelay: "-6s" }} />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:pt-14">
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

        <div className="mx-auto mt-14 max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Harga yang sederhana
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Semua plan membuka seluruh katalog model dengan key yang sama. Yang
            membedakan hanya besar kuotanya. Naik atau turun plan kapan saja,
            dan plan Gratis selalu tersedia.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} featured={plan.id === "pro"} />
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-2xl space-y-2 text-center text-[13px] leading-relaxed text-zinc-500">
          <p>
            Harga plan berbayar dalam dolar AS; perkiraan rupiah mengikuti kurs
            saat penagihan dan pajak yang berlaku di wilayahmu dihitung saat
            pembayaran.
          </p>
          <p>
            Pembayaran diproses dengan aman oleh Paddle. Langganan diperpanjang
            otomatis dan dapat dibatalkan kapan saja, ketentuannya ada di{" "}
            <Link href="/refunds" className="text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition hover:text-lime-200">
              Kebijakan Pengembalian
            </Link>
            .
          </p>
        </div>

        <p className="mt-16 border-t border-white/[0.06] pt-6 text-center text-[11px] font-bold uppercase tracking-[0.42em] text-zinc-500">
          Work Fast · Work Smart
        </p>
      </div>
    </main>
  );
}
