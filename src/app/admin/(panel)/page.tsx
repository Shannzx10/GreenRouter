import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import Reveal from "../../Reveal";
import { Activity, KeyRound, Network, Server, TicketCheck, Coins, TriangleAlert } from "lucide-react";

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

export default async function OverviewPage() {
  await connection();
  const session = await getSession();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [me, providers, upstreamKeys, models, clientKeys, requestsToday, tokensToday, recent, problemKeys] =
    await Promise.all([
      session
        ? prisma.user.findUnique({
            where: { id: session.uid },
            select: { name: true, image: true },
          })
        : Promise.resolve(null),
      prisma.provider.count(),
      prisma.upstreamKey.count(),
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
      prisma.upstreamKey.findMany({
        where: { status: { in: ["LIMITED", "DISABLED"] } },
        orderBy: { updatedAt: "desc" },
        include: { provider: { select: { name: true, id: true } } },
      }),
    ]);

  const displayName = me?.name ?? session?.email.split("@")[0] ?? "Admin";

  const cards = [
    { label: "Provider", value: providers, icon: Server },
    { label: "Key Hulu", value: upstreamKeys, icon: KeyRound },
    { label: "Model", value: models, icon: Network },
    { label: "Key Klien Aktif", value: clientKeys, icon: TicketCheck },
    { label: "Request Hari Ini", value: requestsToday, icon: Activity },
    { label: "Token Hari Ini", value: tokensToday._sum.totalTokens ?? 0, icon: Coins },
  ];

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
              Panel Admin
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
          Semua tentang gateway GreenRouter, diringkas dalam satu halaman.
        </p>
      </Reveal>

      {problemKeys.length > 0 && (
        <Reveal>
          <div className="mt-8 rounded-3xl border border-red-400/25 bg-red-500/[0.07] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/25">
                <TriangleAlert size={19} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-red-200 sm:text-lg">Key hulu butuh tindakan kamu</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-red-200/80">
                  {problemKeys.map((k) => (
                    <li key={k.id}>
                      Key <span className="font-medium text-red-100">{k.label}</span> ({k.provider.name},{" "}
                      <span className="font-mono text-xs">{k.keyHint}</span>){" "}
                      {k.status === "LIMITED"
                        ? "terkena limit token (402 dari hulu) dan sudah dinonaktifkan otomatis. Key ini tidak akan dipakai lagi sampai kamu mengaktifkannya kembali."
                        : "dinonaktifkan karena ditolak hulu (401/403). Periksa key-nya, lalu aktifkan kembali bila sudah benar."}{" "}
                      <Link href={`/admin/providers/${k.provider.id}`} className="font-medium text-red-100 underline decoration-red-300/40 underline-offset-2 transition hover:decoration-red-100">
                        Buka diagnosis {k.provider.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* ===== Statistik ===== */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
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

      {/* ===== Aktivitas ===== */}
      <Reveal>
        <div className="mt-14">
          <SectionHead eyebrow="Gateway" title="Aktivitas Terakhir">
            Sepuluh request terbaru yang melewati gateway, dari semua user.
          </SectionHead>
          <div className="mt-5 overflow-x-auto glass rounded-3xl">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Waktu</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium">Provider</th>
                  <th className="px-4 py-2.5 font-medium">Key Klien</th>
                  <th className="px-4 py-2.5 font-medium">Token</th>
                  <th className="px-4 py-2.5 font-medium">Latency</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                      Belum ada request tercatat.
                    </td>
                  </tr>
                )}
                {recent.map((l) => (
                  <tr key={l.id} className="border-t border-white/[0.05]">
                    <td className="px-4 py-2.5 whitespace-nowrap text-zinc-400">{fmtTime(l.createdAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.modelId}</td>
                    <td className="px-4 py-2.5">{l.provider?.name ?? "-"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.apiKey?.prefix ?? "-"}</td>
                    <td className="px-4 py-2.5">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
                    <td className="px-4 py-2.5">{l.latencyMs != null ? `${l.latencyMs} ms` : "-"}</td>
                    <td className="px-4 py-2.5">
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
  );
}
