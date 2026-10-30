import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Blocks,
  Gauge,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Reveal from "./Reveal";
import CodeShowcase from "./CodeShowcase";
import ProviderIcon from "./ProviderIcon";
import SmoothAnchors from "./SmoothAnchors";

const MODELS = [
  { id: "deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash" },
  { id: "glm-5.3-flash", label: "GLM 5.3 Flash" },
  { id: "glm-5.3-flash-dhl", label: "GLM 5.3 Flash DHL" },
  { id: "minimax-m2.7", label: "MiniMax M2.7" },
  { id: "deepseek-v4-flash-0731", label: "DeepSeek V4 Flash 0731" },
  { id: "mimo-v2.6-flash", label: "MiMo V2.6 Flash" },
  { id: "minicpm-v-4.7-35b-a3b", label: "MiniCPM-V 4.7 35B" },
  { id: "qwen3.8-27b", label: "Qwen3.8 27B" },
  { id: "kimi-k2.6", label: "Kimi K2.6" },
  { id: "glm-5.3", label: "GLM 5.3" },
  { id: "qwen3.5", label: "Qwen3.5" },
  { id: "atria-dawn", label: "Atria Dawn" },
  { id: "mercury-3", label: "Mercury 3" },
];

const FEATURES = [
  {
    icon: KeyRound,
    title: "Satu Key, Semua Model",
    body: "Satu API key membuka seluruh katalog model. Tidak perlu daftar dan mengurus key di banyak tempat.",
  },
  {
    icon: Zap,
    title: "Streaming Real-Time",
    body: "Jawaban mengalir kata demi kata begitu dihasilkan, terasa secepat mengetik, tanpa menunggu lama.",
  },
  {
    icon: Gauge,
    title: "Kuota Jelas & Adil",
    body: "Setiap akun baru membawa 5.000.000 token per siklus 7 hari, dengan batas 100 request per jam. Progres pemakaian selalu transparan di dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Aman & Pribadi",
    body: "Masuk cukup dengan Google atau GitHub. Key milikmu sepenuhnya dalam kendalimu, cabut atau ganti kapan saja.",
  },
  {
    icon: Blocks,
    title: "Kompatibel OpenAI & Anthropic",
    body: "Dua format API paling populer dalam satu key. Ganti base URL saja, SDK OpenAI, Anthropic, dan tool favoritmu langsung bekerja.",
  },
  {
    icon: Sparkles,
    title: "Tanpa Ribet",
    body: "Tanpa formulir panjang, tanpa antre, tanpa proses berbelit. Daftar semenit, langsung berkarya.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Daftar dalam Semenit",
    body: "Masuk dengan Google atau GitHub, tanpa formulir panjang, langsung jadi.",
  },
  {
    n: "02",
    title: "Buat API Key",
    body: "Satu klik di dashboard dan key pertamamu langsung aktif, lengkap dengan kuota 5.000.000 token.",
  },
  {
    n: "03",
    title: "Pakai di Tool Favoritmu",
    body: "Tempel base URL dan key di OpenCode, Claude Code, atau aplikasi apa pun yang mendukung OpenAI & Anthropic.",
  },
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
  { name: "Kimi", kind: "kimi" },
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
    // Logo provider di-host sendiri di public/assets/providers (dari oxionai.com).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/providers/${kind}.png`}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      className="h-9 w-9 rounded-[10px] ring-1 ring-white/15"
    />
  );
}

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <SmoothAnchors />
      {/* Latar panggung */}
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-120px] top-[-80px] h-96 w-96 bg-emerald-500/25" />
      <div className="aurora right-[-100px] top-48 h-80 w-80 bg-lime-400/20" style={{ animationDelay: "-6s" }} />
      <div className="aurora bottom-[24%] left-[-140px] h-80 w-80 bg-teal-400/15" style={{ animationDelay: "-11s" }} />
      <div className="aurora bottom-0 right-[-80px] h-96 w-96 bg-lime-500/10" style={{ animationDelay: "-3s" }} />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-5 sm:px-8">
        {/* Navigasi melayang */}
        <header className="glass sticky top-4 z-40 flex items-center justify-between rounded-full py-2.5 pl-4 pr-2.5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-lg font-bold tracking-tight">
              Green<span className="text-lime-300">Router</span>
            </span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
            <a href="#fitur" className="transition hover:text-lime-200">Fitur</a>
            <a href="#cara-mulai" className="transition hover:text-lime-200">Cara Mulai</a>
            <a href="#model" className="transition hover:text-lime-200">Model</a>
            <a href="#kuota" className="transition hover:text-lime-200">Kuota</a>
            <Link href="/app/docs" className="transition hover:text-lime-200">Dokumentasi</Link>
          </nav>
          <div className="flex items-center gap-2">
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
          </div>
        </header>

        {/* Hero */}
        <section className="mt-16 text-center sm:mt-24">
          <Reveal>
            <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-lime-200 sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
              Semua sistem online, katalog model terus bertambah
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="mx-auto mt-7 max-w-3xl text-[44px] font-extrabold leading-[1.03] tracking-tight sm:text-7xl">
              Satu key,
              <br />
              <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                semua model AI.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-6 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.42em] text-zinc-400 sm:text-xs">
              <span className="hidden h-px w-10 bg-gradient-to-r from-transparent to-lime-300/50 sm:block" />
              Work Fast · Work Smart
              <span className="hidden h-px w-10 bg-gradient-to-l from-transparent to-lime-300/50 sm:block" />
            </p>
          </Reveal>
          <Reveal delay={300}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Akses model-model AI terbaik lewat satu API key. Daftar dalam semenit dan
              langsung pakai di tool favoritmu. Tanpa ribet.
            </p>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-shine inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-7 py-3.5 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300 sm:w-auto"
              >
                Mulai Sekarang <ArrowRight size={17} />
              </Link>
              <a
                href="#cara-mulai"
                className="glass inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-200 sm:w-auto"
              >
                Pelajari Selengkapnya <ArrowDown size={17} />
              </a>
            </div>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-300 sm:text-sm">
              {["5.000.000 token tiap siklus", "Katalog model premium", "Streaming real-time", "Daftar cuma 1 menit"].map((s) => (
                <span key={s} className="glass rounded-full px-3.5 py-1.5">{s}</span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Showcase kode */}
        <section className="relative mx-auto mt-14 max-w-2xl sm:mt-20">
          <Reveal>
            <div className="glass rounded-[26px] p-1.5 shadow-[0_30px_80px_-30px_rgba(163,230,53,0.35)]">
              <CodeShowcase />
            </div>
          </Reveal>
        </section>
      </div>

      {/* Marquee provider */}
      <section className="relative mt-16 border-y border-white/[0.06] bg-white/[0.015] py-6 sm:mt-24">
        <p className="mb-5 px-5 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">
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
        {/* Fitur */}
        <section id="fitur" className="scroll-mt-28 pt-16 sm:pt-24">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">Kenapa GreenRouter</p>
            <h2 className="mx-auto mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Kecil-kecil cabai rawit?
              <br />
              <span className="text-zinc-400">Tidak. Ini kelas premium.</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={(i % 3) * 110} className="h-full">
                  <div className="glass group h-full rounded-3xl p-6 transition duration-300 hover:-translate-y-1.5 hover:border-lime-300/35 hover:shadow-[0_24px_50px_-20px_rgba(163,230,53,0.35)]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-300 transition group-hover:bg-lime-400 group-hover:text-zinc-950">
                      <Icon size={20} />
                    </span>
                    <p className="mt-4 font-semibold">{f.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Cara mulai */}
        <section id="cara-mulai" className="scroll-mt-28 pt-16 sm:pt-24">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">Cara Mulai</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tiga langkah, langsung jalan
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 130} className="h-full">
                <div className="glass relative h-full overflow-hidden rounded-3xl p-6">
                  <span className="pointer-events-none absolute -right-2 -top-5 bg-gradient-to-b from-lime-300/25 to-transparent bg-clip-text text-[92px] font-extrabold leading-none text-transparent">
                    {s.n}
                  </span>
                  <p className="relative mt-8 font-semibold">{s.title}</p>
                  <p className="relative mt-1.5 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Hubungkan Alat */}
        <section id="alat" className="scroll-mt-28 pt-16 sm:pt-24">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">Hubungkan Alat</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Pakai di alat favoritmu
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              GreenRouter menyambung ke alat coding populer dengan base URL dan API key yang
              sama. Hubungkan sekali, lalu semua model langsung bisa dipilih dari alatmu.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {TOOLS.map((t, i) => (
              <Reveal key={t.name} delay={(i % 4) * 110} className="h-full">
                <div className="glass group h-full rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:border-lime-300/40">
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-white/15 transition duration-300 group-hover:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.logo} alt={t.name} className="h-8 w-8 object-contain" loading="lazy" />
                  </span>
                  <p className="mt-4 font-semibold">{t.name}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{t.kind}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Link
              href="/app/docs"
              className="inline-flex items-center gap-2 text-sm font-medium text-lime-300 transition hover:text-lime-200"
            >
              Lihat panduan menghubungkan tiap alat <ArrowRight size={16} />
            </Link>
          </Reveal>
        </section>

        {/* Model */}
        <section id="model" className="scroll-mt-28 pt-16 sm:pt-24">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">Katalog Model</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Semua model, satu key
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              Dari yang tercepat untuk tugas harian sampai yang paling cerdas untuk pekerjaan berat,
              semua siap dipanggil kapan saja.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODELS.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 100} className="h-full">
                <div className="glass group flex h-full items-center gap-3.5 rounded-3xl px-5 py-4 transition duration-300 hover:-translate-y-1 hover:border-lime-300/35">
                  <ProviderIcon modelId={m.id} className="h-11 w-11" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{m.label}</p>
                    <p className="break-all font-mono text-xs leading-snug text-zinc-500">{m.id}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-lime-400/10 px-2.5 py-1 text-[11px] font-medium text-lime-300">
                    Siap pakai
                  </span>
                </div>
              </Reveal>
            ))}
            <Reveal delay={300} className="h-full">
              <Link
                href="/register"
                className="group flex h-full items-center gap-3.5 rounded-3xl border border-dashed border-lime-300/30 bg-lime-400/[0.04] px-5 py-4 transition duration-300 hover:-translate-y-1 hover:bg-lime-400/[0.08]"
              >
                <div>
                  <p className="font-semibold text-lime-200">Dan Model Lainnya</p>
                  <p className="text-xs text-zinc-400">Katalog lengkap tersedia di dashboard, semua langsung aktif dengan key yang sama.</p>
                </div>
                <ArrowRight size={18} className="ml-auto shrink-0 text-lime-300 transition group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Pita kuota */}
        <section id="kuota" className="scroll-mt-28 pt-16 sm:pt-24">
          <Reveal>
            <div className="glass relative overflow-hidden rounded-[32px] px-6 py-12 text-center sm:py-16">
              <div className="aurora left-1/2 top-[-120px] h-72 w-72 -translate-x-1/2 bg-lime-400/20" />
              <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
                Untuk setiap akun baru
              </p>
              <p className="text-gradient-anim relative mt-4 bg-gradient-to-r from-lime-200 via-lime-300 to-emerald-300 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-8xl">
                5.000.000
              </p>
              <p className="relative mt-3 text-lg font-medium text-zinc-200">
                token gratis, diperbarui setiap siklus 7 hari
              </p>
              <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                Bukan trial sekali pakai. Kuotamu terisi penuh lagi setiap siklus,
                dengan batas pemakaian 100 request per jam, dan progresnya bisa
                kamu pantau transparan di dashboard.
              </p>
              <Link
                href="/register"
                className="btn-shine relative mt-8 inline-flex items-center gap-2 rounded-full bg-lime-400 px-7 py-3.5 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300"
              >
                Klaim Kuotamu <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </section>

        {/* CTA penutup */}
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
            <Link
              href="/register"
              className="btn-shine mt-8 inline-flex items-center gap-2 rounded-full bg-lime-400 px-8 py-4 font-semibold text-zinc-950 shadow-[0_10px_40px_-8px_rgba(163,230,53,0.55)] transition hover:bg-lime-300"
            >
              Daftar Gratis Sekarang <ArrowRight size={18} />
            </Link>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/[0.06] pb-8 pt-12 sm:mt-28">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/brand/leaf.png" alt="GreenRouter" className="h-9 w-9 shrink-0 object-contain" />
                <span className="text-lg font-bold tracking-tight">
                  Green<span className="text-lime-300">Router</span>
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
                Satu key untuk semua model AI.
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                Work Fast · Work Smart
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Mulai</p>
              <ul className="mt-3 space-y-2.5 text-sm text-zinc-400">
                <li><Link href="/register" className="transition hover:text-lime-200">Daftar Gratis</Link></li>
                <li><Link href="/login" className="transition hover:text-lime-200">Masuk</Link></li>
                <li><Link href="/app/docs" className="transition hover:text-lime-200">Dokumentasi</Link></li>
                <li><a href="#model" className="transition hover:text-lime-200">Katalog Model</a></li>
                <li><a href="#kuota" className="transition hover:text-lime-200">Kuota Akun Baru</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Model Populer</p>
              <ul className="mt-3 space-y-2.5 font-mono text-[13px] text-zinc-400">
                {MODELS.map((m) => (
                  <li key={m.id}>{m.id}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-6 text-xs text-zinc-500 sm:flex-row">
            <p>© 2026 GreenRouter. Seluruh hak cipta dilindungi.</p>
            <p className="font-medium tracking-wide text-zinc-400">Work Fast, Work Smart.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
