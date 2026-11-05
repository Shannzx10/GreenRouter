import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import Link from "next/link";
import Reveal from "../../Reveal";
import { Spot } from "../../landing/Interactive";
import { PANEL, Pill, SectionHead } from "../../app/ui";
import { Activity, ArrowUpRight, Network, TicketCheck, Coins, ExternalLink } from "lucide-react";

/** Angka ringkas untuk kartu statistik: 999, 1,5K, 2,3M, 1B. */
function fmtCompact(n: number): string {
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}K`;
  return String(n);
}

function fmtTime(d: Date) {
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function OverviewPage() {
  await connection();
  const session = await getSession();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [me, models, clientKeys, requestsToday, tokensToday, recent] =
    await Promise.all([
      session
        ? prisma.user.findUnique({
            where: { id: session.uid },
            select: { name: true, image: true },
          })
        : Promise.resolve(null),
      prisma.modelCatalog.count(),
      prisma.apiKey.count({ where: { isActive: true } }),
      prisma.usageLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.usageLog.aggregate({
        where: { createdAt: { gte: startOfDay }, status: "SUCCESS" },
        _sum: { totalTokens: true },
      }),
      prisma.usageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { provider: { select: { name: true } }, apiKey: { select: { prefix: true } } },
      }),
    ]);

  // Status hulu tunggal: 9Router lokal (semua provider dikelola di sana).
  // Probe memakai akar dashboard yang murah; /v1/models lambat karena
  // disusun langsung dari hulu sehingga tidak layak jadi penanda hidup.
  let routerHealthy = false;
  try {
    const r = await fetch("http://127.0.0.1:20128/", {
      signal: AbortSignal.timeout(2500),
      redirect: "manual",
    });
    routerHealthy = r.status > 0 && r.status < 500;
  } catch {}

  const displayName = me?.name ?? session?.email.split("@")[0] ?? "Admin";

  const cards = [
    { label: "Model", value: models, icon: Network },
    { label: "Key Klien Aktif", value: clientKeys, icon: TicketCheck },
    { label: "Request Hari Ini", value: requestsToday, icon: Activity },
    { label: "Token Hari Ini", value: tokensToday._sum.totalTokens ?? 0, icon: Coins },
  ];

  const okPill = "bg-lime-400/10 text-lime-300";
  const badPill = "bg-red-500/15 text-red-300";

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* ===== Sambutan ===== */}
      <Reveal>
        <div className="flex flex-wrap items-center gap-4">
          {me?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.image}
              alt={displayName}
              className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/15"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400 text-2xl font-extrabold text-zinc-950">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-lime-300/85">
              <span className="h-1.5 w-1.5 bg-lime-300" />
              Panel Admin
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight sm:text-4xl">
              Halo,{" "}
              <span className="text-gradient-anim bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Semua tentang gateway GreenRouter, diringkas dalam satu halaman.
        </p>
      </Reveal>

      {/* ===== Status hulu ===== */}
      <Reveal className="mt-6">
        <div className={`${PANEL} flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center`}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
              {routerHealthy && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${routerHealthy ? "bg-lime-400" : "bg-red-400"}`} />
            </span>
            <p className="text-sm leading-relaxed text-zinc-300">
              <span className={`font-semibold ${routerHealthy ? "text-lime-200" : "text-red-300"}`}>
                Hulu 9Router {routerHealthy ? "terhubung" : "tidak terjangkau"}.
              </span>{" "}
              Semua provider dan key hulu dikelola di dashboard 9Router.
            </p>
          </div>
          <a
            href="https://manager.greenrouter.eu.cc"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-lime-300 transition hover:text-lime-200 sm:ml-auto"
          >
            Buka Dashboard 9Router <ExternalLink size={14} />
          </a>
        </div>
      </Reveal>

      {/* ===== Statistik ===== */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

      {/* ===== Aktivitas ===== */}
      <Reveal className="mt-12">
        <SectionHead
          eyebrow="Gateway"
          title="Aktivitas Terakhir"
          action={
            <Link href="/admin/logs" className="inline-flex items-center gap-1 text-sm font-medium text-lime-300 transition hover:text-lime-200">
              Semua log <ArrowUpRight size={15} />
            </Link>
          }
        >
          Sepuluh request terbaru yang melewati gateway, dari semua user.
        </SectionHead>
        <div className={`${PANEL} mt-4 overflow-hidden`}>
          {recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">Belum ada request tercatat.</p>
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
                      {fmtTime(l.createdAt)} · {l.provider?.name ?? "-"} ·{" "}
                      <span className="font-mono">{l.apiKey?.prefix ?? "-"}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {l.totalTokens?.toLocaleString("id-ID") ?? "-"} token · {l.latencyMs != null ? `${l.latencyMs} ms` : "-"}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Waktu</th>
                      <th className="px-4 py-3 font-medium">Model</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Key Klien</th>
                      <th className="px-4 py-3 text-right font-medium">Token</th>
                      <th className="px-4 py-3 text-right font-medium">Latency</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((l) => (
                      <tr key={l.id} className="border-t border-white/[0.05] transition hover:bg-white/[0.025]">
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmtTime(l.createdAt)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{l.modelId}</td>
                        <td className="px-4 py-3">{l.provider?.name ?? "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{l.apiKey?.prefix ?? "-"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{l.latencyMs != null ? `${l.latencyMs} ms` : "-"}</td>
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
