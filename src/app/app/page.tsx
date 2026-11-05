import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CYCLE_DAYS, cycleTokensUsed, fmtDateShort, fmtResetIn, hourlyRequestsUsed } from "@/lib/quota";
import { planById } from "@/lib/plans";
import Reveal from "../Reveal";
import { Spot } from "../landing/Interactive";
import AnnouncementSlider from "./AnnouncementSlider";
import { PANEL, Pill, SectionHead } from "./ui";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Coins,
  Gauge,
  KeyRound,
  TicketCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

const DAY_MS = 86_400_000;

/** Angka ringkas untuk kartu statistik: 999, 1,5K, 2,3M, 1B. */
function fmtCompact(n: number): string {
  const trim = (v: number) =>
    v.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}K`;
  return String(n);
}

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function UserOverviewPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { name: true, image: true, createdAt: true, plan: true, tokenLimit: true, requestLimitHourly: true },
  });

  const now = new Date();
  const startOfDay = dayStart(now);
  const mine = { apiKey: { userId: session.uid } };
  const trendStart = new Date(dayStart(now).getTime() - 13 * DAY_MS);

  const [
    activeKeys,
    requestsToday,
    tokensToday,
    totalRequests,
    recent,
    announcements,
    trendLogs,
  ] = await Promise.all([
    prisma.apiKey.count({ where: { userId: session.uid, isActive: true } }),
    prisma.usageLog.count({ where: { ...mine, createdAt: { gte: startOfDay } } }),
    prisma.usageLog.aggregate({
      where: { ...mine, createdAt: { gte: startOfDay }, status: "SUCCESS" },
      _sum: { totalTokens: true },
    }),
    prisma.usageLog.count({ where: mine }),
    prisma.usageLog.findMany({
      where: mine,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { apiKey: { select: { prefix: true } } },
    }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.usageLog.findMany({
      where: { ...mine, createdAt: { gte: trendStart } },
      select: { createdAt: true, totalTokens: true },
    }),
  ]);

  const [{ used: cycleUsed, window: cycle }, hourly] = await Promise.all([
    cycleTokensUsed(session.uid, me?.createdAt ?? now),
    hourlyRequestsUsed(session.uid),
  ]);
  const tokenLimit = me?.tokenLimit ?? null;
  const hourlyLimit = me?.requestLimitHourly ?? null;
  const quotaPct = tokenLimit ? Math.min(100, Math.round((cycleUsed / tokenLimit) * 100)) : null;
  const hourlyPct = hourlyLimit ? Math.min(100, Math.round((hourly.count / hourlyLimit) * 100)) : null;
  const barTone = (p: number) => (p >= 100 ? "bg-red-400" : p >= 80 ? "bg-amber-300" : "bg-lime-400");
  const ringTone = (p: number) => (p >= 100 ? "#f87171" : p >= 80 ? "#fcd34d" : "#bef264");
  const planName = planById(me?.plan ?? "gratis").name;
  const RING_C = 2 * Math.PI * 52;

  const cards = [
    { label: "Key Aktif Saya", value: activeKeys, icon: KeyRound },
    { label: "Request Hari Ini", value: requestsToday, icon: Activity },
    { label: "Token Hari Ini", value: tokensToday._sum.totalTokens ?? 0, icon: Coins },
    { label: "Total Request", value: totalRequests, icon: TicketCheck },
  ];

  // ===== Tren 14 hari + perbandingan 7 vs 7 hari =====
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(trendStart.getTime() + i * DAY_MS);
    return {
      start,
      tokens: 0,
      dayNum: start.getDate(),
      full: start.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    };
  });
  for (const log of trendLogs) {
    const idx = Math.floor((dayStart(log.createdAt).getTime() - trendStart.getTime()) / DAY_MS);
    if (idx >= 0 && idx < 14) days[idx].tokens += log.totalTokens ?? 0;
  }
  const maxDayTokens = Math.max(...days.map((d) => d.tokens), 1);
  const last7 = days.slice(7).reduce((s, d) => s + d.tokens, 0);
  const prev7 = days.slice(0, 7).reduce((s, d) => s + d.tokens, 0);
  const total14 = last7 + prev7;
  const changePct = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null;

  const displayName = me?.name ?? session.email.split("@")[0];

  const fmtDT = (d: Date) => d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const okPill = "bg-lime-400/10 text-lime-300";
  const badPill = "bg-red-500/15 text-red-300";

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* ===== Sambutan ===== */}
      <Reveal>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {me?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.image}
                alt={displayName}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-white/15"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime-400 text-2xl font-extrabold text-zinc-950">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-lime-300/85">
                <span className="h-1.5 w-1.5 bg-lime-300" />
                Dashboard
              </p>
              <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight sm:text-4xl">
                Halo,{" "}
                <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/25 bg-lime-400/10 px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-lime-200 transition hover:bg-lime-400/20"
            >
              <Zap size={13} /> Plan {planName}
            </Link>
            <Link
              href="/app/keys"
              className="btn-shine inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
            >
              <KeyRound size={15} /> Kelola Key
            </Link>
            <Link
              href="/app/docs"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/50 hover:text-lime-200"
            >
              <BookOpen size={15} /> Dokumentasi
            </Link>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Semua tentang pemakaian GreenRouter milikmu, diringkas dalam satu halaman.
        </p>
      </Reveal>

      {/* ===== Pengumuman ===== */}
      {announcements.length > 0 && (
        <Reveal className="mt-6">
          <AnnouncementSlider
            items={announcements.map((a) => ({
              id: a.id,
              title: a.title,
              body: a.body,
              dateLabel: a.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" }),
            }))}
          />
        </Reveal>
      )}

      {/* ===== Statistik ===== */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.label} delay={i * 70} className="h-full">
              <Spot className="h-full rounded-3xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] leading-snug text-zinc-400">{c.label}</p>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                    <Icon size={16} />
                  </span>
                </div>
                <p
                  className="mt-3 text-[28px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[34px]"
                  title={c.value.toLocaleString("id-ID")}
                >
                  {fmtCompact(c.value)}
                </p>
              </Spot>
            </Reveal>
          );
        })}
      </div>

      {/* ===== Kuota + Tren ===== */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.5fr)]">
        <Reveal className="h-full">
          <section className={`${PANEL} flex h-full flex-col p-5 sm:p-6`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                  <Gauge size={16} />
                </span>
                Kuota
              </h2>
              <Pill className="bg-white/[0.06] text-zinc-300">Siklus {CYCLE_DAYS} hari</Pill>
            </div>

            {tokenLimit && quotaPct !== null ? (
              <>
                <div className="mt-5 flex items-center gap-5">
                  <div className="relative h-[116px] w-[116px] shrink-0">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke={ringTone(quotaPct)}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        strokeDashoffset={RING_C * (1 - quotaPct / 100)}
                        className="ring-in"
                        style={{ ["--c" as string]: RING_C, filter: "drop-shadow(0 0 6px rgba(190,242,100,0.4))" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold tabular-nums">{quotaPct}%</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">terpakai</span>
                    </div>
                  </div>
                  <dl className="min-w-0 space-y-3 text-sm">
                    <div>
                      <dt className="text-zinc-500">Terpakai</dt>
                      <dd className="truncate font-semibold tabular-nums">
                        {cycleUsed.toLocaleString("id-ID")}
                        <span className="font-normal text-zinc-500"> / {tokenLimit.toLocaleString("id-ID")}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Sisa kuota</dt>
                      <dd className="truncate font-semibold tabular-nums text-lime-200">
                        {Math.max(0, tokenLimit - cycleUsed).toLocaleString("id-ID")} token
                      </dd>
                    </div>
                  </dl>
                </div>
                <p className="mt-5 rounded-2xl bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-zinc-400">
                  {fmtDateShort(cycle.start)} – {fmtDateShort(cycle.end)}
                  <span className="text-zinc-600"> · </span>
                  diperbarui {fmtResetIn(cycle.end)}
                </p>
              </>
            ) : (
              <div className="mt-5 text-sm text-zinc-400">
                <p>
                  Terpakai siklus ini:{" "}
                  <span className="font-semibold text-zinc-100">{cycleUsed.toLocaleString("id-ID")}</span> token
                </p>
                <p className="mt-1.5 text-xs text-zinc-500">Akunmu tidak dibatasi kuota.</p>
              </div>
            )}

            <div className="mt-auto pt-5">
              <div className="border-t border-white/[0.07] pt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <p className="text-zinc-400">Request per jam</p>
                  <p className="tabular-nums text-zinc-300">
                    {hourly.count.toLocaleString("id-ID")}
                    {hourlyLimit ? <span className="text-zinc-500"> / {hourlyLimit.toLocaleString("id-ID")}</span> : null}
                  </p>
                </div>
                {hourlyLimit && hourlyPct !== null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className={`h-full rounded-full ${barTone(hourlyPct)}`} style={{ width: `${hourlyPct}%` }} />
                  </div>
                )}
                <Link
                  href="/app/profile"
                  className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-lime-300 transition hover:text-lime-200"
                >
                  Detail kuota di profil <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal className="h-full">
          <section className={`${PANEL} flex h-full flex-col p-5 sm:p-6`}>
            <div>
              <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-lime-300/85">
                <span className="h-1.5 w-1.5 bg-lime-300" />
                Aktivitas Kamu
              </p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight">Tren Pemakaian</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Token yang kamu pakai dalam 14 hari terakhir, dibandingkan dengan periode sebelumnya.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-sm text-zinc-400">
                7 hari terakhir{" "}
                <span className="ml-1 text-lg font-extrabold text-zinc-50">{last7.toLocaleString("id-ID")} token</span>
              </p>
              {prev7 === 0 && last7 > 0 && <Pill className={okPill}>Baru mulai aktif</Pill>}
              {changePct !== null && (
                <Pill className={changePct >= 0 ? okPill : "bg-white/[0.06] text-zinc-300"}>
                  {changePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {changePct >= 0 ? "Naik" : "Turun"} {Math.abs(changePct).toFixed(0)}% dari 7 hari sebelumnya
                </Pill>
              )}
              <p className="text-sm text-zinc-500 sm:ml-auto">
                Total 14 hari{" "}
                <span className="font-semibold text-zinc-300">{total14.toLocaleString("id-ID")} token</span>
              </p>
            </div>
            {total14 === 0 ? (
              <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-zinc-500">
                Belum ada pemakaian dalam 14 hari terakhir. Grafikmu akan muncul di sini setelah request pertamamu.
              </p>
            ) : (
              <div className="mt-6 flex flex-1 gap-2">
                <div className="flex w-9 shrink-0 flex-col justify-between pb-5 text-right font-mono text-[10px] text-zinc-600">
                  <span>{fmtCompact(maxDayTokens)}</span>
                  <span>{fmtCompact(Math.round(maxDayTokens / 2))}</span>
                  <span>0</span>
                </div>
                <div className="relative min-h-[190px] flex-1">
                  <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">
                    {[0, 1, 2].map((g) => (
                      <div key={g} className="h-px bg-white/[0.06]" />
                    ))}
                  </div>
                  <div className="relative flex h-full items-stretch gap-1 sm:gap-2">
                    {days.map((d, idx) => (
                      <div key={d.start.toISOString()} className="group relative flex flex-1 flex-col items-center gap-1.5">
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={`w-full rounded-md bg-gradient-to-t transition ${
                              idx === days.length - 1
                                ? "from-lime-400/70 to-lime-200"
                                : "from-lime-500/35 via-lime-400/60 to-lime-300/90 group-hover:to-lime-200"
                            }`}
                            style={{
                              height: `${Math.max(2, (d.tokens / maxDayTokens) * 100)}%`,
                              minHeight: d.tokens > 0 ? 6 : 2,
                            }}
                          />
                        </div>
                        <span className={`text-[10px] leading-none ${idx === days.length - 1 ? "font-bold text-lime-300" : "text-zinc-500"}`}>
                          {d.dayNum}
                        </span>
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-200 opacity-0 shadow-xl transition group-hover:opacity-100">
                          {d.full}: <b className="text-lime-300">{d.tokens.toLocaleString("id-ID")}</b>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </Reveal>
      </div>

      {/* ===== Aktivitas terakhir ===== */}
      <Reveal className="mt-12">
        <SectionHead eyebrow="Terbaru" title="Aktivitas Terakhir" action={
          <Link href="/app/logs" className="inline-flex items-center gap-1 text-sm font-medium text-lime-300 transition hover:text-lime-200">
            Semua log <ArrowUpRight size={15} />
          </Link>
        }>
          Delapan request terakhir dari key milikmu.
        </SectionHead>
        <div className={`${PANEL} mt-4 overflow-hidden`}>
          {recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">Belum ada request dari key milikmu.</p>
          ) : (
            <>
              <ul className="divide-y divide-white/[0.06] md:hidden">
                {recent.map((l) => (
                  <li key={l.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-mono text-xs text-zinc-200">{l.modelId}</p>
                      <Pill className={l.status === "SUCCESS" ? okPill : badPill}>{l.status}</Pill>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {fmtDT(l.createdAt)} · <span className="font-mono">{l.apiKey?.prefix ?? "-"}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {l.totalTokens?.toLocaleString("id-ID") ?? "-"} token · {l.latencyMs != null ? `${l.latencyMs} ms` : "-"}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Waktu</th>
                      <th className="px-4 py-3 font-medium">Model</th>
                      <th className="px-4 py-3 font-medium">Key</th>
                      <th className="px-4 py-3 text-right font-medium">Token</th>
                      <th className="px-4 py-3 text-right font-medium">Latency</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((l) => (
                      <tr key={l.id} className="border-t border-white/[0.05] transition hover:bg-white/[0.025]">
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmtDT(l.createdAt)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{l.modelId}</td>
                        <td className="px-4 py-3 font-mono text-xs">{l.apiKey?.prefix ?? "-"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{l.latencyMs != null ? `${l.latencyMs} ms` : "-"}</td>
                        <td className="px-4 py-3">
                          <Pill className={l.status === "SUCCESS" ? okPill : badPill}>{l.status}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
