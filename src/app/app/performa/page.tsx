import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PageHeader, PANEL, Pill } from "../ui";
import ProviderIcon from "@/app/ProviderIcon";

// Halaman Performa: status dan kecepatan tiap model dari dua sumber
// yang sudah ada, tes berkala (ModelHealthCheck) untuk status dan
// riwayat latensi, serta agregat UsageLog 7 hari untuk latensi nyata,
// kecepatan output, dan tingkat keberhasilan. Semua agregat global
// (bukan per pengguna) karena yang ditampilkan performa modelnya.

type Check = { status: string; latencyMs: number; checkedAt: Date };

const MAX_POINTS = 30;

function fmtLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk`;
}

function fmtAgo(d: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// Grafik garis latensi tes berkala. Skala Y dihitung hanya dari titik
// sukses; titik gagal digambar sebagai penanda merah di tepi atas
// supaya latensi timeout-nya tidak meratakan seluruh garis.
function LatencyChart({ checks }: { checks: Check[] }) {
  const ok = checks.filter((c) => c.status === "SUCCESS");
  if (checks.length === 0) {
    return (
      <div className="flex h-[76px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-xs text-zinc-500">
        Belum ada data pengukuran untuk model ini.
      </div>
    );
  }
  const W = 320;
  const H = 76;
  const PAD = 6;
  const vals = ok.map((c) => c.latencyMs);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const span = max - min || 1;
  const x = (i: number) =>
    checks.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (checks.length - 1);
  const y = (v: number) => H - PAD - 8 - ((v - min) / span) * (H - 2 * PAD - 12);

  const okPoints = checks
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.status === "SUCCESS");
  const line = okPoints.map(({ c, i }) => `${x(i)},${y(c.latencyMs)}`).join(" ");
  const area =
    okPoints.length > 1
      ? `M ${x(okPoints[0].i)},${H - 2} L ${okPoints
          .map(({ c, i }) => `${x(i)},${y(c.latencyMs)}`)
          .join(" L ")} L ${x(okPoints[okPoints.length - 1].i)},${H - 2} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[76px] w-full"
      role="img"
      aria-label="Grafik riwayat latensi model"
    >
      <defs>
        <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(163 230 53)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(163 230 53)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#perfFill)" />}
      {okPoints.length > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke="rgb(163 230 53)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {checks.map((c, i) =>
        c.status === "SUCCESS" ? (
          <circle
            key={i}
            cx={x(i)}
            cy={y(c.latencyMs)}
            r={i === checks.length - 1 ? 3 : 1.8}
            fill={i === checks.length - 1 ? "rgb(190 242 100)" : "rgb(163 230 53)"}
          />
        ) : (
          <circle key={i} cx={x(i)} cy={PAD + 2} r={2.4} fill="rgb(248 113 113)" />
        ),
      )}
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-100" title={value}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}

export default async function PerformaPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const viewer = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { plan: true },
  });
  const viewerPlan = viewer?.plan ?? "gratis";
  const now = new Date();

  const models = await prisma.modelCatalog.findMany({ orderBy: { displayName: "asc" } });
  const ids = models.map((m) => m.modelId);
  const routes = await prisma.modelRoute.findMany({
    where: { isActive: true },
    select: { modelId: true },
  });
  // ModelRoute.modelId adalah id katalog (cuid); petakan ke modelId publik.
  const catalogById = new Map(models.map((m) => [m.id, m.modelId]));
  const routed = new Set(
    routes.map((r) => catalogById.get(r.modelId)).filter((v): v is string => !!v),
  );

  const checks = await prisma.modelHealthCheck.findMany({
    where: { modelId: { in: ids } },
    orderBy: { checkedAt: "asc" },
    select: { modelId: true, status: true, latencyMs: true, checkedAt: true },
  });
  const checksByModel = new Map<string, Check[]>();
  for (const c of checks) {
    const arr = checksByModel.get(c.modelId) ?? [];
    arr.push(c);
    checksByModel.set(c.modelId, arr);
  }

  // eslint-disable-next-line react-hooks/purity -- komponen server: waktu request dibaca saat render memang disengaja
  const since7 = new Date(Date.now() - 7 * 86400_000);
  const usage = await prisma.usageLog.groupBy({
    by: ["modelId", "status"],
    where: { createdAt: { gte: since7 }, modelId: { in: ids } },
    _count: { _all: true },
    _avg: { latencyMs: true },
    _sum: { latencyMs: true, completionTokens: true },
  });
  type Agg = { total: number; success: number; avgLatency: number | null; speed: number | null };
  const aggByModel = new Map<string, Agg>();
  for (const u of usage) {
    const a = aggByModel.get(u.modelId) ?? { total: 0, success: 0, avgLatency: null, speed: null };
    a.total += u._count._all;
    if (u.status === "SUCCESS") {
      a.success += u._count._all;
      a.avgLatency = u._avg.latencyMs ?? null;
      const latSum = u._sum.latencyMs ?? 0;
      const tokSum = u._sum.completionTokens ?? 0;
      a.speed = latSum > 0 && tokSum > 0 ? tokSum / (latSum / 1000) : null;
    }
    aggByModel.set(u.modelId, a);
  }

  const cards = models.map((m) => {
    const all = checksByModel.get(m.modelId) ?? [];
    const points = all.slice(-MAX_POINTS);
    const latest = all.length ? all[all.length - 1] : null;
    const agg = aggByModel.get(m.modelId) ?? { total: 0, success: 0, avgLatency: null, speed: null };
    const successRate = agg.total > 0 ? Math.round((agg.success / agg.total) * 100) : null;
    const rank = !routed.has(m.modelId)
      ? 3
      : latest == null
        ? 2
        : latest.status === "SUCCESS"
          ? 0
          : 1;
    return {
      m,
      points,
      latest,
      agg,
      successRate,
      rank,
      active: routed.has(m.modelId),
      earlyAccess: !!m.earlyAccessUntil && m.earlyAccessUntil > now,
    };
  });
  cards.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.latest?.latencyMs ?? Number.MAX_SAFE_INTEGER) -
        (b.latest?.latencyMs ?? Number.MAX_SAFE_INTEGER) ||
      a.m.displayName.localeCompare(b.m.displayName),
  );

  const activeCount = cards.filter((c) => c.latest?.status === "SUCCESS").length;
  const downCount = cards.filter((c) => c.latest?.status === "ERROR").length;
  const fastest = cards
    .filter((c) => c.latest?.status === "SUCCESS")
    .sort((a, b) => (a.latest?.latencyMs ?? 0) - (b.latest?.latencyMs ?? 0))[0];

  const summary: { label: string; value: string }[] = [
    { label: "Model dipantau", value: String(models.length) },
    { label: "Aktif pada tes terakhir", value: String(activeCount) },
    { label: "Sedang gangguan", value: String(downCount) },
    {
      label: "Tercepat pada tes terakhir",
      value: fastest ? `${fastest.m.displayName} · ${fmtLatency(fastest.latest!.latencyMs)}` : "—",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Gateway" title="Performa">
        <p>Status dan kecepatan setiap model dari pengukuran berkala serta pemakaian nyata.</p>
      </PageHeader>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className={`${PANEL} px-4 py-3.5`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className="mt-1 truncate text-base font-bold text-zinc-50" title={s.value}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {cards.map(({ m, points, latest, agg, successRate, active, earlyAccess }) => {
          const status = !active
            ? { label: "Nonaktif", cls: "bg-white/[0.06] text-zinc-400", dot: "bg-zinc-500" }
            : latest == null
              ? { label: "Belum diukur", cls: "bg-white/[0.06] text-zinc-400", dot: "bg-zinc-500" }
              : latest.status === "SUCCESS"
                ? { label: "Aktif", cls: "bg-lime-400/10 text-lime-300", dot: "bg-lime-300" }
                : { label: "Gangguan", cls: "bg-red-400/10 text-red-300", dot: "bg-red-400" };
          return (
            <section key={m.id} className={`${PANEL} p-5`}>
              <div className="flex items-center gap-3">
                <ProviderIcon modelId={m.modelId} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-zinc-50">{m.displayName}</h2>
                  <p className="truncate font-mono text-[11px] text-zinc-500">{m.modelId}</p>
                </div>
                {earlyAccess && viewerPlan === "gratis" && (
                  <Pill className="bg-amber-400/10 px-2.5 py-1 font-medium text-amber-300">
                    Akses Awal
                  </Pill>
                )}
                <Pill className={`flex items-center gap-1.5 px-2.5 py-1 font-medium ${status.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </Pill>
              </div>

              <div className="mt-4">
                <LatencyChart checks={points} />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Riwayat latensi tes berkala</span>
                  <span>
                    {points.length > 0
                      ? `${points.length} pengukuran · ${fmtDay(points[0].checkedAt)} – ${fmtDay(points[points.length - 1].checkedAt)}`
                      : "belum ada pengukuran"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat
                  label="Tes terakhir"
                  value={latest ? fmtLatency(latest.latencyMs) : "—"}
                  sub={latest ? fmtAgo(latest.checkedAt) : undefined}
                />
                <Stat
                  label="Latensi rata-rata"
                  value={agg.avgLatency != null ? fmtLatency(agg.avgLatency) : "—"}
                  sub="pemakaian 7 hari"
                />
                <Stat
                  label="Kecepatan output"
                  value={agg.speed != null ? `${Math.round(agg.speed)} tok/dtk` : "—"}
                  sub="pemakaian 7 hari"
                />
                <Stat
                  label="Keberhasilan"
                  value={successRate != null ? `${successRate}%` : "—"}
                  sub={agg.total > 0 ? `${agg.total} request, 7 hari` : "belum ada request"}
                />
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-zinc-500">
        Latensi tes berkala diukur dengan request kecil yang sama untuk semua model. Latensi
        rata-rata dan kecepatan output dihitung dari pemakaian nyata 7 hari terakhir.
      </p>
    </div>
  );
}
