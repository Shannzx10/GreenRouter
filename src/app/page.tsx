import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Crown,
  Sprout,
  Zap,
} from "lucide-react";
import { PLANS, formatIdNumber } from "@/lib/plans";
import Reveal from "./Reveal";
import SiteFooter from "./SiteFooter";
import CodeShowcase from "./CodeShowcase";
import ProviderIcon from "./ProviderIcon";
import SmoothAnchors from "./SmoothAnchors";
import Nav from "./landing/Nav";
import CursorGlow from "./landing/CursorGlow";
import HeroCanvas from "./landing/HeroCanvas";
import RouterCanvas from "./landing/RouterCanvas";
import Steps from "./landing/Steps";
import { Spot, Magnetic } from "./landing/Interactive";
import { CountUp, QuotaGauge } from "./landing/Quota";
import { KeyViz, StreamViz, QuotaViz, ShieldViz, CompatViz, SpeedViz } from "./landing/FeatureViz";

const MODELS = [
  { id: "glm-5.3-flash", label: "GLM 5.3 Flash" },
  { id: "minimax-m2.7", label: "MiniMax M2.7" },
  { id: "deepseek-v4-flash-0731", label: "DeepSeek V4 Flash 0731" },
  { id: "deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { id: "mimo-v2.5", label: "MiMo V2.5" },
  { id: "minicpm-v-4.7-35b-a3b", label: "MiniCPM-V 4.7 35B" },
  { id: "qwen3.8-27b", label: "Qwen3.8 27B" },
  { id: "kimi-k2.6", label: "Kimi K2.6" },
  { id: "glm-5.3", label: "GLM 5.3" },
  { id: "mercury-3", label: "Mercury 3" },
];

const FEATURES = [
  {
    title: "Satu Key, Semua Model",
    body: "Satu API key membuka seluruh katalog model. Tidak perlu daftar dan mengurus key di banyak tempat.",
    viz: <KeyViz />,
    span: "md:col-span-3",
  },
  {
    title: "Streaming Real-Time",
    body: "Jawaban mengalir kata demi kata begitu dihasilkan, terasa secepat mengetik, tanpa menunggu lama.",
    viz: <StreamViz />,
    span: "md:col-span-3",
  },
  {
    title: "Kuota Jelas & Adil",
    body: "Setiap akun baru membawa 5.000.000 token per siklus 7 hari, dengan batas 300 request per jam. Progres pemakaian selalu transparan di dashboard.",
    viz: <QuotaViz />,
    span: "md:col-span-2",
  },
  {
    title: "Aman & Pribadi",
    body: "Masuk cukup dengan Google atau GitHub. Key milikmu sepenuhnya dalam kendalimu, cabut atau ganti kapan saja.",
    viz: <ShieldViz />,
    span: "md:col-span-2",
  },
  {
    title: "Kompatibel OpenAI & Anthropic",
    body: "Dua format API paling populer dalam satu key. Ganti base URL saja, SDK OpenAI, Anthropic, dan tool favoritmu langsung bekerja.",
    viz: <CompatViz />,
    span: "md:col-span-2",
  },
  {
    title: "Tanpa Ribet",
    body: "Tanpa formulir panjang, tanpa antre, tanpa proses berbelit. Daftar semenit, langsung berkarya.",
    viz: <SpeedViz />,
    span: "md:col-span-6",
  },
];

const STEPS = [
  { n: "01", title: "Daftar dalam Semenit", body: "Masuk dengan Google atau GitHub, tanpa formulir panjang, langsung jadi." },
  { n: "02", title: "Buat API Key", body: "Satu klik di dashboard dan key pertamamu langsung aktif, lengkap dengan kuota 5.000.000 token." },
  { n: "03", title: "Pakai di Tool Favoritmu", body: "Tempel base URL dan key di OpenCode, Claude Code, atau aplikasi apa pun yang mendukung OpenAI & Anthropic." },
];

const TOOLS = [
  { name: "OpenCode", kind: "Agen coding terminal", logo: "/assets/tools/opencode.svg" },
  { name: "Claude Code", kind: "Agen coding terminal", logo: "/assets/tools/claudecode.svg" },
  { name: "Codex", kind: "Agen coding dari OpenAI", logo: "/assets/tools/codex-mark.svg" },
  { name: "Cursor", kind: "Editor kode berbasis AI", logo: "/assets/tools/cursor.svg" },
  { name: "Cline", kind: "Ekstensi agen untuk VS Code", logo: "/assets/tools/cline.svg" },
  { name: "Continue", kind: "Ekstensi AI untuk editor", logo: "/assets/tools/continue.png" },
  { name: "Aider", kind: "Pair programming di terminal", logo: "/assets/tools/aider.png" },
  { name: "Open WebUI", kind: "Antarmuka chat self-hosted", logo: "/assets/tools/openwebui.png" },
];

const PROVIDERS = [
  { name: "DeepSeek", kind: "deepseek" },
  { name: "Z.ai", kind: "zai" },
  { name: "MiniMax", kind: "minimax" },
  { name: "MiMo", kind: "mimo" },
  { name: "MiniCPM", kind: "minicpm" },
  { name: "Qwen", kind: "qwen" },
  { name: "Kimi", kind: "kimi" },
  { name: "Mercury", kind: "mercury" },
  { name: "Atria", kind: "atria" },
] as const;

function ProviderTile({ kind }: { kind: (typeof PROVIDERS)[number]["kind"] }) {
  if (kind === "minimax") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white ring-1 ring-white/15">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#F23F42" aria-hidden>
          <path d="M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997" />
        </svg>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/assets/providers/${kind}.png`} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 rounded-[10px] ring-1 ring-white/15" />
  );
}

function Head({ tag, title, sub }: { tag: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-lime-300/90">
        <span className="h-1.5 w-1.5 bg-lime-300" />
        {tag}
        <span className="h-1.5 w-1.5 bg-lime-300" />
      </p>
      <h2 className="mt-4 text-[clamp(1.85rem,5vw,3rem)] font-extrabold leading-[1.05] tracking-tight">{title}</h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">{sub}</p>}
    </Reveal>
  );
}

function Words({ text, grad = false, start = 0 }: { text: string; grad?: boolean; start?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <span
            className={
              "hw inline-block " +
              (grad ? "text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent" : "")
            }
            style={{ animationDelay: `${150 + (start + i) * 110}ms` }}
          >
            {w}
          </span>
        </span>
      ))}
    </>
  );
}

const BTN_PRIMARY =
  "btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-7 py-3.5 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300";

export default function Home() {
  return (
    <main className="lp-grain relative flex-1 overflow-x-clip bg-[#060806]">
      <SmoothAnchors />
      <Nav />
      <CursorGlow />

      {/* ============ HERO ============ */}
      <section className="relative isolate overflow-hidden">
        <div className="lp-grid absolute inset-0 -z-20" />
        <HeroCanvas className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_65%,transparent)]" />
        <div className="absolute left-1/2 top-[-10%] -z-10 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-lime-400/10 blur-[120px]" />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:min-h-[100svh] lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-24">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-3.5 py-1.5 font-mono text-[11px] text-lime-200 sm:text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
                </span>
                Semua sistem online, katalog model terus bertambah
              </div>
            </Reveal>

            <h1 className="mt-6 text-[clamp(2.7rem,8.4vw,5.7rem)] font-extrabold leading-[0.98] tracking-tight">
              <Words text="Satu key," />
              <br />
              <Words text="semua model AI." grad start={2} />
            </h1>

            <Reveal delay={500}>
              <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.4em] text-zinc-500 sm:text-xs">
                Work Fast · Work Smart
              </p>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
                Akses model-model AI terbaik lewat satu API key. Daftar dalam semenit dan langsung pakai di tool
                favoritmu. Tanpa ribet.
              </p>
            </Reveal>

            <Reveal delay={650}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Magnetic className="w-full sm:w-auto">
                  <Link href="/register" className={BTN_PRIMARY + " w-full sm:w-auto"}>
                    Mulai Sekarang <ArrowRight size={17} />
                  </Link>
                </Magnetic>
                <Magnetic className="w-full sm:w-auto">
                  <a
                    href="#cara-mulai"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 font-semibold text-zinc-100 transition hover:border-lime-300/50 hover:text-lime-200 sm:w-auto"
                  >
                    Pelajari Selengkapnya <ArrowDown size={17} />
                  </a>
                </Magnetic>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 font-mono text-[11px] text-zinc-300 sm:text-xs">
                {["5.000.000 token tiap siklus", "Katalog model premium", "Streaming real-time", "Daftar cuma 1 menit"].map((s) => (
                  <span key={s} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                    <span className="mr-1.5 text-lime-300">+</span>
                    {s}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={400}>
            <div className="animate-float">
              <Spot tilt max={7} className="rounded-[26px] p-1.5 shadow-[0_40px_90px_-30px_rgba(163,230,53,0.4)] backdrop-blur-sm">
                <CodeShowcase />
              </Spot>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ MARQUEE PROVIDER ============ */}
      <section className="relative border-y border-white/[0.07] bg-white/[0.015] py-6">
        <p className="mb-5 px-5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Model dari provider yang sudah kamu kenal
        </p>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="animate-marquee flex w-max items-center gap-14 pr-14">
            {[...PROVIDERS, ...PROVIDERS, ...PROVIDERS, ...PROVIDERS, ...PROVIDERS, ...PROVIDERS].map((p, i) => (
              <span key={i} className="flex items-center gap-3 whitespace-nowrap">
                <ProviderTile kind={p.kind} />
                <span className="text-lg font-semibold text-zinc-200">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ============ CARA KERJA ============ */}
        <section className="pt-20 sm:pt-28">
          <Head
            tag="Cara Kerja"
            title="Dari model terbaik, langsung ke tool favoritmu"
            sub="Model AI kelas atas dikumpulkan GreenRouter menjadi satu key, lalu diteruskan ke aplikasi dan agen coding yang kamu pakai setiap hari."
          />
          <Reveal delay={120}>
            <div className="spot mt-10 overflow-hidden rounded-[28px] p-2 sm:p-4">
              <RouterCanvas />
            </div>
          </Reveal>
        </section>

        {/* ============ FITUR ============ */}
        <section id="fitur" className="scroll-mt-28 pt-20 sm:pt-28">
          <Head
            tag="Kenapa GreenRouter"
            title={
              <>
                Kecil-kecil cabai rawit?
                <br />
                <span className="text-zinc-500">Tidak. Ini kelas premium.</span>
              </>
            }
          />
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100} className={"h-full " + f.span}>
                <Spot className="flex h-full flex-col overflow-hidden rounded-3xl p-6">
                  <div className="flex flex-1 items-center justify-center pb-5">
                    <div className="w-full">{f.viz}</div>
                  </div>
                  <div className="border-t border-white/[0.07] pt-4">
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-400">{f.body}</p>
                  </div>
                </Spot>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============ CARA MULAI ============ */}
        <section id="cara-mulai" className="scroll-mt-28 pt-20 sm:pt-28">
          <Head tag="Cara Mulai" title="Tiga langkah, langsung jalan" />
          <div className="mt-12">
            <Steps steps={STEPS} />
          </div>
        </section>

        {/* ============ ALAT ============ */}
        <section id="alat" className="scroll-mt-28 pt-20 sm:pt-28">
          <Head
            tag="Hubungkan Alat"
            title="Pakai di alat favoritmu"
            sub="GreenRouter menyambung ke alat coding populer dengan base URL dan API key yang sama. Hubungkan sekali, lalu semua model langsung bisa dipilih dari alatmu."
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {TOOLS.map((t, i) => (
              <Reveal key={t.name} delay={(i % 4) * 90} className="h-full">
                <Spot tilt max={9} className="group h-full rounded-3xl p-5">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-white/15 transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.logo} alt={t.name} className="h-8 w-8 object-contain" loading="lazy" />
                  </span>
                  <p className="mt-4 font-semibold">{t.name}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{t.kind}</p>
                </Spot>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Link href="/app/docs" className="inline-flex items-center gap-2 text-sm font-medium text-lime-300 transition hover:gap-3 hover:text-lime-200">
              Lihat panduan menghubungkan tiap alat <ArrowRight size={16} />
            </Link>
          </Reveal>
        </section>

        {/* ============ PLAN ============ */}
        <section id="plan" className="scroll-mt-28 pt-20 sm:pt-28">
          <Head
            tag="Plan dan Harga"
            title="Mulai gratis, naik kapan saja"
            sub="Semua plan membuka seluruh katalog model dengan key yang sama. Yang membedakan hanya besar kuotanya."
          />
          <div className="mt-12 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => {
              const featured = plan.id === "pro";
              const Icon = plan.id === "pro" ? Zap : plan.id === "max" ? Crown : Sprout;
              return (
                <Reveal key={plan.id} delay={i * 90} className="h-full">
                  <Spot
                    tilt
                    max={5}
                    className={
                      "relative flex h-full flex-col rounded-3xl p-7 " +
                      (featured ? "plan-hot shadow-[0_20px_70px_-20px_rgba(163,230,53,0.4)] md:-translate-y-2" : "")
                    }
                  >
                    {featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime-400 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-950">
                        Paling Populer
                      </span>
                    )}
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 text-lg font-bold tracking-tight">{plan.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{plan.tagline}</p>
                    <p className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {plan.priceIdrMonthly > 0 ? `Rp${formatIdNumber(plan.priceIdrMonthly)}` : "Rp0"}
                      </span>
                      <span className="text-sm text-zinc-500">/ bulan</span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5 text-sm text-zinc-300">
                      <li className="flex gap-2.5">
                        <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                        {formatIdNumber(plan.tokenLimit)} token per siklus 7 hari
                      </li>
                      <li className="flex gap-2.5">
                        <Check size={16} className="mt-0.5 shrink-0 text-lime-300" />
                        {formatIdNumber(plan.requestLimitHourly)} request per jam
                      </li>
                    </ul>
                  </Spot>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={120}>
            <div className="mt-10 text-center">
              <Magnetic>
                <Link href="/pricing" className={BTN_PRIMARY + " px-8 py-4"}>
                  Lihat Semua Plan <ArrowRight size={18} />
                </Link>
              </Magnetic>
              <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-500">
                Perbandingan lengkap, pertanyaan umum, dan pembelian ada di halaman harga. Tersedia juga paket tahunan yang lebih hemat 17 persen.
              </p>
            </div>
          </Reveal>
        </section>
      </div>

      {/* ============ MODEL (marquee dua baris) ============ */}
      <section id="model" className="scroll-mt-28 pt-20 sm:pt-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Head
            tag="Katalog Model"
            title="Semua model, satu key"
            sub="Dari yang tercepat untuk tugas harian sampai yang paling cerdas untuk pekerjaan berat, semua siap dipanggil kapan saja."
          />
        </div>
        <div className="mt-10 space-y-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {[false, true].map((rev) => {
            const list = rev ? [...MODELS].reverse() : MODELS;
            return (
              <div key={String(rev)} className={"animate-marquee flex w-max gap-3 pr-3 " + (rev ? "marquee-rev" : "")}>
                {[...list, ...list].map((m, i) => (
                  <div
                    key={m.id + i}
                    className="spot flex w-[300px] shrink-0 items-center gap-3.5 rounded-3xl px-5 py-4 transition hover:border-lime-300/40 sm:w-[340px]"
                  >
                    <ProviderIcon modelId={m.id} className="h-11 w-11" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-snug">{m.label}</p>
                      <p className="truncate font-mono text-xs leading-snug text-zinc-500">{m.id}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-lime-400/10 px-2.5 py-1 text-[11px] font-medium text-lime-300">
                      Siap pakai
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <Reveal className="mx-auto mt-6 max-w-6xl px-5 sm:px-8">
          <Link
            href="/register"
            className="group mx-auto flex max-w-xl items-center gap-3.5 rounded-3xl border border-dashed border-lime-300/30 bg-lime-400/[0.04] px-5 py-4 transition duration-300 hover:-translate-y-1 hover:bg-lime-400/[0.08]"
          >
            <div>
              <p className="font-semibold text-lime-200">Dan Model Lainnya</p>
              <p className="text-xs text-zinc-400">Katalog lengkap tersedia di dashboard, semua langsung aktif dengan key yang sama.</p>
            </div>
            <ArrowRight size={18} className="ml-auto shrink-0 text-lime-300 transition group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </section>

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ============ KUOTA ============ */}
        <section id="kuota" className="scroll-mt-28 pt-20 sm:pt-28">
          <Reveal>
            <Spot className="relative overflow-hidden rounded-[32px] px-6 py-12 sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-lime-400/15 blur-[100px]" />
              <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="text-center lg:text-left">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-lime-300/90">
                    Untuk setiap akun baru
                  </p>
                  <p className="mt-4 text-[clamp(3rem,10vw,6.5rem)] font-extrabold leading-none tracking-tight">
                    <CountUp className="text-gradient-anim bg-gradient-to-r from-lime-200 via-lime-300 to-emerald-300 bg-clip-text text-transparent" />
                  </p>
                  <p className="mt-4 text-lg font-medium text-zinc-200">token gratis, diperbarui setiap siklus 7 hari</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400 lg:mx-0">
                    Bukan trial sekali pakai. Kuotamu terisi penuh lagi setiap siklus, dengan batas pemakaian 300 request per jam, dan progresnya bisa kamu pantau transparan di dashboard.
                  </p>
                  <div className="mt-8">
                    <Magnetic>
                      <Link href="/register" className={BTN_PRIMARY}>
                        Klaim Kuotamu <ArrowRight size={17} />
                      </Link>
                    </Magnetic>
                  </div>
                </div>
                <QuotaGauge />
              </div>
            </Spot>
          </Reveal>
        </section>
      </div>

      {/* ============ CTA PENUTUP ============ */}
      <section className="relative isolate mt-20 overflow-hidden sm:mt-28">
        <HeroCanvas density={0.7} className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_75%,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-36">
          <Reveal>
            <h2 className="text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[1] tracking-tight">
              Work Fast,
              <br />
              <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Work Smart.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-400">
              Berhenti mengurus banyak key dan banyak langganan. Satu key GreenRouter, dan kamu kembali fokus berkarya.
            </p>
            <div className="mt-9">
              <Magnetic>
                <Link href="/register" className={BTN_PRIMARY + " px-8 py-4"}>
                  Daftar Gratis Sekarang <ArrowRight size={18} />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
