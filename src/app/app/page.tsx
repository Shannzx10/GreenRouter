import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import Reveal from "../Reveal";
import {
  Activity,
  Coins,
  KeyRound,
  Megaphone,
  TicketCheck,
  TrendingDown,
  TrendingUp,
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

type ModelStatus = { label: string; dot: string; pill: string };

function statusFor(count24: number, success24: number, total30: number): ModelStatus {
  if (count24 === 0) {
    return total30 > 0
      ? { label: "Senyap", dot: "bg-zinc-500", pill: "bg-white/[0.06] text-zinc-400" }
      : { label: "Belum ada data", dot: "bg-zinc-600", pill: "bg-white/[0.06] text-zinc-500" };
  }
  const rate = (success24 / count24) * 100;
  if (rate >= 95)
    return { label: "Sehat", dot: "bg-lime-300", pill: "bg-lime-400/10 text-lime-300" };
  if (rate >= 80)
    return { label: "Perlu perhatian", dot: "bg-amber-300", pill: "bg-amber-400/10 text-amber-300" };
  return { label: "Terganggu", dot: "bg-red-400", pill: "bg-red-500/15 text-red-300" };
}

function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{children}</p>}
    </div>
  );
}

export default async function UserOverviewPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { name: true, image: true },
  });

  const now = new Date();
  const startOfDay = dayStart(now);
  const mine = { apiKey: { userId: session.uid } };
  const trendStart = new Date(dayStart(now).getTime() - 13 * DAY_MS);
  const perfStart = new Date(now.getTime() - 30 * DAY_MS);
  const dayAgo = new Date(now.getTime() - DAY_MS);

  const [
    activeKeys,
    requestsToday,
    tokensToday,
    totalRequests,
    recent,
    announcements,
    trendLogs,
    perfLogs,
    catalog,
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
    prisma.usageLog.findMany({
      where: { createdAt: { gte: perfStart } },
      select: { modelId: true, status: true, latencyMs: true, createdAt: true },
    }),
    prisma.modelCatalog.findMany({ orderBy: { displayName: "asc" } }),
  ]);

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

  // ===== Performa & status model (global, 30 hari) =====
  type Agg = {
    total: number;
    success: number;
    latencySum: number;
    latencyCount: number;
    lastAt: Date | null;
    count24: number;
    success24: number;
  };
  const aggByModel = new Map<string, Agg>();
  for (const log of perfLogs) {
    const agg = aggByModel.get(log.modelId) ?? {
      total: 0,
      success: 0,
      latencySum: 0,
      latencyCount: 0,
      lastAt: null,
      count24: 0,
      success24: 0,
    };
    agg.total += 1;
    if (log.status === "SUCCESS") agg.success += 1;
    if (log.latencyMs != null) {
      agg.latencySum += log.latencyMs;
      agg.latencyCount += 1;
    }
    if (!agg.lastAt || log.createdAt > agg.lastAt) agg.lastAt = log.createdAt;
    if (log.createdAt >= dayAgo) {
      agg.count24 += 1;
      if (log.status === "SUCCESS") agg.success24 += 1;
    }
    aggByModel.set(log.modelId, agg);
  }
  const modelRows = catalog
    .map((m) => {
      const agg = aggByModel.get(m.modelId);
      return {
        modelId: m.modelId,
        displayName: m.displayName,
        total: agg?.total ?? 0,
        successRate: agg && agg.total > 0 ? (agg.success / agg.total) * 100 : null,
        avgLatency:
          agg && agg.latencyCount > 0 ? Math.round(agg.latencySum / agg.latencyCount) : null,
        lastAt: agg?.lastAt ?? null,
        status: statusFor(agg?.count24 ?? 0, agg?.success24 ?? 0, agg?.total ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName));
  const healthyCount = modelRows.filter((r) => r.status.label === "Sehat").length;
  const displayName = me?.name ?? session.email.split("@")[0];

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="relative">
        {/* ===== Sambutan ===== */}
        <Reveal>
          <div className="flex flex-wrap items-center gap-4">
            {me?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.image}
                alt={displayName}
                className="h-14 w-14 rounded-3xl object-cover ring-1 ring-white/15"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-lime-400 text-2xl font-extrabold text-zinc-950">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
                Dashboard
              </p>
              <h1 className="mt-1 truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
                Halo,{" "}
                <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Semua tentang pemakaian GreenRouter milikmu, diringkas dalam satu halaman.
          </p>
        </Reveal>

        {/* ===== Pengumuman ===== */}
        {announcements.length > 0 && (
          <div className="mt-8 flex flex-col gap-3">
            {announcements.map((a, i) => (
              <Reveal key={a.id} delay={i * 90}>
                <article className="glass group rounded-3xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-lime-300/25 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                      <Megaphone size={19} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime-300">
                        Pengumuman
                        <span className="ml-2 font-medium normal-case tracking-normal text-zinc-500">
                          {a.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                        </span>
                      </p>
                      <h3 className="mt-1 font-semibold sm:text-lg">{a.title}</h3>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                        {a.body}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        {/* ===== Statistik ===== */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.label} delay={i * 80}>
                <div className="glass group h-full rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:border-lime-300/25 hover:shadow-[0_20px_50px_-20px_rgba(163,230,53,0.35)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                      <Icon size={19} />
                    </span>
                    <p
                      className="text-right text-[27px] font-extrabold leading-none tracking-tight tabular-nums sm:text-3xl"
                      title={c.value.toLocaleString("id-ID")}
                    >
                      {fmtCompact(c.value)}
                    </p>
                  </div>
                  <p className="mt-3.5 text-sm text-zinc-400">{c.label}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* ===== Tren ===== */}
        <Reveal>
          <div className="mt-14">
            <SectionHead eyebrow="Aktivitas Kamu" title="Tren Pemakaian">
              Token yang kamu pakai dalam 14 hari terakhir, dibandingkan dengan periode
              sebelumnya.
            </SectionHead>
            <div className="glass mt-5 rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="text-sm text-zinc-400">
                  7 hari terakhir{" "}
                  <span className="ml-1 text-xl font-extrabold text-zinc-50">
                    {last7.toLocaleString("id-ID")} token
                  </span>
                </p>
                {prev7 === 0 && last7 > 0 && (
                  <span className="rounded-full bg-lime-400/10 px-2.5 py-1 text-xs font-medium text-lime-300">
                    Baru mulai aktif
                  </span>
                )}
                {changePct !== null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      changePct >= 0
                        ? "bg-lime-400/10 text-lime-300"
                        : "bg-white/[0.06] text-zinc-300"
                    }`}
                  >
                    {changePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {changePct >= 0 ? "Naik" : "Turun"} {Math.abs(changePct).toFixed(0)}% dari 7
                    hari sebelumnya
                  </span>
                )}
                <p className="ml-auto text-sm text-zinc-500">
                  Total 14 hari{" "}
                  <span className="font-semibold text-zinc-300">
                    {total14.toLocaleString("id-ID")} token
                  </span>
                </p>
              </div>
              {total14 === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Belum ada pemakaian dalam 14 hari terakhir. Grafikmu akan muncul di sini
                  setelah request pertamamu.
                </p>
              ) : (
                <div className="mt-6 flex h-44 items-stretch gap-1.5 sm:gap-2.5">
                  {days.map((d) => (
                    <div
                      key={d.start.toISOString()}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex w-full flex-1 items-end">
                        <div
                          title={`${d.full}: ${d.tokens.toLocaleString("id-ID")} token`}
                          className="w-full rounded-md bg-gradient-to-t from-lime-500/50 via-lime-400/80 to-lime-300 transition hover:from-lime-400 hover:to-lime-200"
                          style={{
                            height: `${Math.max(2, (d.tokens / maxDayTokens) * 100)}%`,
                            minHeight: d.tokens > 0 ? 6 : 2,
                          }}
                        />
                      </div>
                      <span className="text-[10px] leading-none text-zinc-500">{d.dayNum}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ===== Performa & status model ===== */}
        <Reveal>
          <div className="mt-14">
            <SectionHead eyebrow="Katalog Model" title="Performa dan Status Model">
              Dari seluruh request di GreenRouter selama 30 hari terakhir. {healthyCount} dari{" "}
              {modelRows.length} model berstatus sehat dalam 24 jam terakhir.
            </SectionHead>
            <div className="mt-5 overflow-x-auto glass rounded-3xl">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-white/[0.04] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Request</th>
                    <th className="px-4 py-3 font-medium">Sukses</th>
                    <th className="px-4 py-3 font-medium">Latensi Rata-rata</th>
                    <th className="px-4 py-3 font-medium">Terakhir Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRows.map((r) => (
                    <tr
                      key={r.modelId}
                      className="border-t border-white/[0.05] transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-200">{r.displayName}</p>
                        <p className="font-mono text-[11px] text-zinc-500">{r.modelId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${r.status.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${r.status.dot}`} />
                          {r.status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.total.toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">
                        {r.successRate !== null
                          ? `${r.successRate.toFixed(1).replace(".", ",")}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {r.avgLatency !== null ? `${r.avgLatency.toLocaleString("id-ID")} ms` : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {r.lastAt
                          ? r.lastAt.toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* ===== Aktivitas terakhir ===== */}
        <Reveal>
          <div className="mt-14">
            <SectionHead eyebrow="Terbaru" title="Aktivitas Terakhir">
              Delapan request terakhir dari key milikmu.
            </SectionHead>
            <div className="mt-5 overflow-x-auto glass rounded-3xl">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-white/[0.04] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Token</th>
                    <th className="px-4 py-3 font-medium">Latency</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                        Belum ada request dari key milikmu.
                      </td>
                    </tr>
                  )}
                  {recent.map((l) => (
                    <tr
                      key={l.id}
                      className="border-t border-white/[0.05] transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {l.createdAt.toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{l.modelId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{l.apiKey?.prefix ?? "-"}</td>
                      <td className="px-4 py-3">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
                      <td className="px-4 py-3">{l.latencyMs != null ? `${l.latencyMs} ms` : "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            l.status === "SUCCESS"
                              ? "bg-lime-400/10 text-lime-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
