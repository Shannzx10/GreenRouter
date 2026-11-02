import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import PricingGrid, { type ViewerPlan } from "./PricingGrid";

export const metadata: Metadata = {
  title: "Harga · GreenRouter",
  description:
    "Plan GreenRouter: mulai gratis dengan kuota token per siklus, naik ke Pro dan Max untuk kuota yang jauh lebih besar. Satu key untuk semua model AI.",
};

// Halaman ini membaca sesi, jadi tidak boleh di-prerender statis.
export const instant = false;

// Halaman harga melayani dua penonton sekaligus: pengunjung publik
// (termasuk peninjau Paddle) melihat harga dan tombol pendaftaran,
// sedangkan user yang sudah masuk membeli dan mengganti plan langsung
// di sini. Keadaan penonton dihitung server dari sesi; grid kartunya
// sendiri komponen klien (PricingGrid).
export default async function PricingPage() {
  await connection();
  const session = await getSession();
  let viewerPlan: ViewerPlan = "visitor";
  let userId: string | null = null;
  let email: string | null = null;
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.uid } });
    if (user) {
      viewerPlan = (["gratis", "pro", "max"].includes(user.plan)
        ? user.plan
        : "gratis") as ViewerPlan;
      userId = user.id;
      email = user.email;
    }
  }

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
            href={viewerPlan === "visitor" ? "/" : "/app/profile"}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-lime-200"
          >
            <ArrowLeft size={15} /> {viewerPlan === "visitor" ? "Beranda" : "Profil"}
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

        <PricingGrid
          viewerPlan={viewerPlan}
          userId={userId}
          email={email}
          pricePro={process.env.PADDLE_PRICE_PRO ?? null}
          priceMax={process.env.PADDLE_PRICE_MAX ?? null}
        />

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
