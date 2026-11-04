import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarClock, CreditCard, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import Reveal from "../Reveal";
import SiteFooter from "../SiteFooter";
import Nav from "../landing/Nav";
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
// sendiri komponen klien (PricingGrid). Rangka halaman (nav melayang,
// footer) memakai komponen yang sama persis dengan landing.
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
  const loggedIn = viewerPlan !== "visitor";

  return (
    <main className="lp-grain relative flex-1 overflow-x-clip bg-[#060806]">
      <Nav landing={false} loggedIn={loggedIn} />

      <div className="lp-grid absolute inset-x-0 top-0 h-[560px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-120px] h-[380px] w-[680px] max-w-full -translate-x-1/2 rounded-full bg-lime-400/10 blur-[110px]" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-28 sm:px-8 sm:pt-32">
        {/* Hero ringkas */}
        <section className="text-center">
          <Reveal>
            <p className="inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-lime-300/90">
              <span className="h-1.5 w-1.5 bg-lime-300" />
              Harga GreenRouter
              <span className="h-1.5 w-1.5 bg-lime-300" />
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.2rem,6.5vw,4rem)] font-extrabold leading-[1.05] tracking-tight">
              Harga sederhana,
              <br />
              <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                kuota yang serius.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Semua plan membuka seluruh katalog model dengan key yang sama. Yang
              membedakan hanya besar kuotanya. Naik atau turun plan kapan saja,
              dan plan Gratis selalu tersedia.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] text-zinc-300 sm:text-xs">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <ShieldCheck size={14} className="text-lime-300" /> Pembayaran aman melalui Paddle
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <CalendarClock size={14} className="text-lime-300" /> Batalkan kapan saja
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <CreditCard size={14} className="text-lime-300" /> Kartu, PayPal, Apple Pay, Google Pay
              </span>
            </div>
          </Reveal>
        </section>

        <PricingGrid
          viewerPlan={viewerPlan}
          userId={userId}
          email={email}
          prices={{
            pro: {
              monthly: process.env.PADDLE_PRICE_PRO_MONTHLY ?? null,
              yearly: process.env.PADDLE_PRICE_PRO_YEARLY ?? null,
            },
            max: {
              monthly: process.env.PADDLE_PRICE_MAX_MONTHLY ?? null,
              yearly: process.env.PADDLE_PRICE_MAX_YEARLY ?? null,
            },
          }}
        />

        <div className="mx-auto mt-12 max-w-2xl space-y-2 text-center text-[13px] leading-relaxed text-zinc-500">
          <p>
            Harga ditampilkan dalam rupiah sebagai perkiraan dari harga dolar
            AS dan sudah termasuk pajak. Pembayaran diproses dalam dolar AS,
            jadi angka rupiah yang tertagih mengikuti kurs saat pembayaran.
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
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
