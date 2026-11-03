import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CalendarClock, CreditCard, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import Reveal from "../Reveal";
import SiteFooter from "../SiteFooter";
import PricingFaq from "./PricingFaq";
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
    <main className="relative flex-1 overflow-hidden">
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-120px] top-[-80px] h-96 w-96 bg-emerald-500/25" />
      <div className="aurora right-[-100px] top-48 h-80 w-80 bg-lime-400/20" style={{ animationDelay: "-6s" }} />
      <div className="aurora bottom-[24%] left-[-140px] h-80 w-80 bg-teal-400/15" style={{ animationDelay: "-11s" }} />

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-5 sm:px-8">
        {/* Navigasi melayang, sama seperti landing */}
        <header className="glass sticky top-4 z-40 flex items-center justify-between rounded-full py-2.5 pl-4 pr-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-lg font-bold tracking-tight">
              Green<span className="text-lime-300">Router</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
            <a href="/#fitur" className="transition hover:text-lime-200">Fitur</a>
            <a href="/#cara-mulai" className="transition hover:text-lime-200">Cara Mulai</a>
            <a href="/#model" className="transition hover:text-lime-200">Model</a>
            <a href="/#kuota" className="transition hover:text-lime-200">Kuota</a>
            <span className="font-semibold text-lime-300">Harga</span>
            <Link href="/app/docs" className="transition hover:text-lime-200">Dokumentasi</Link>
          </nav>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link
                href="/app"
                className="btn-shine inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
              >
                Ke Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06] hover:text-lime-200"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="btn-shine inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
                >
                  Daftar Gratis
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="mt-16 text-center sm:mt-20">
          <Reveal>
            <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-lime-200 sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
              </span>
              Harga GreenRouter
            </div>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Harga sederhana,
              <br />
              <span className="bg-gradient-to-r from-lime-200 via-lime-300 to-emerald-300 bg-clip-text text-transparent">
                kuota yang serius.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Semua plan membuka seluruh katalog model dengan key yang sama. Yang
              membedakan hanya besar kuotanya. Naik atau turun plan kapan saja,
              dan plan Gratis selalu tersedia.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-lime-300" /> Pembayaran aman melalui Paddle
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarClock size={16} className="text-lime-300" /> Batalkan kapan saja
              </span>
              <span className="inline-flex items-center gap-2">
                <CreditCard size={16} className="text-lime-300" /> Kartu, PayPal, Apple Pay, Google Pay
              </span>
            </div>
          </Reveal>
        </section>

        <Reveal delay={80}>
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
        </Reveal>

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

        <PricingFaq />

        {/* CTA penutup, struktur dan jarak sama persis dengan landing */}
        <section className="pt-16 text-center sm:pt-24">
          <Reveal>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              Work Fast,
              <br />
              <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Work Smart.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-zinc-400">
              Berhenti mengurus banyak key dan banyak langganan. Satu key GreenRouter,
              dan kamu kembali fokus berkarya.
            </p>
            {loggedIn ? (
              <Link
                href="/app"
                className="btn-shine mt-8 inline-flex items-center gap-2 rounded-full bg-lime-400 px-8 py-4 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300"
              >
                Ke Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn-shine mt-8 inline-flex items-center gap-2 rounded-full bg-lime-400 px-8 py-4 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300"
              >
                Daftar Gratis Sekarang <ArrowRight size={18} />
              </Link>
            )}
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
