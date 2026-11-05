import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { planById } from "@/lib/plans";
import { Activity, ChevronLeft, ChevronRight, Coins, Download, Gauge, RotateCcw, ScrollText, SlidersHorizontal } from "lucide-react";
import { PageHeader, PANEL, Pill } from "../ui";

const PAGE_SIZE = 25;
// Pilihan periode mengikuti rentang statistik plan: Gratis 7
// hari, Pro 30 hari, Max 90 hari. Nilai "" berarti seluruh
// rentang plan (tetap dibatasi statsDays, bukan semua waktu).
const PERIODS = [
  { v: "", label: "Seluruh rentang plan" },
  { v: "24j", label: "24 jam terakhir", days: 1 },
  { v: "7h", label: "7 hari terakhir", days: 7 },
  { v: "30h", label: "30 hari terakhir", days: 30 },
  { v: "90h", label: "90 hari terakhir", days: 90 },
] as const;

const selectCls = (active: boolean) =>
  `w-full rounded-xl border bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15 ${
    active ? "border-lime-300/40 text-lime-100" : "border-white/10"
  }`;

// Jendela nomor halaman: 1 … n-1 n n+1 … last
function pageWindow(cur: number, last: number): (number | "…")[] {
  const set = new Set([1, last, cur - 1, cur, cur + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default async function UserLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { plan: true },
  });
  const plan = planById(user?.plan ?? "gratis");
  const periodOptions = PERIODS.filter(
    (p) => p.v === "" || p.days <= plan.statsDays,
  );
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const periodRaw = pick("periode");
  const period = periodOptions.some((p) => p.v === periodRaw) ? periodRaw : "";
  const statusRaw = pick("status");
  const status = statusRaw === "SUCCESS" || statusRaw === "ERROR" ? statusRaw : "";
  const model = pick("model");
  const keyId = pick("key");
  const page = Math.max(1, parseInt(pick("page") || "1", 10) || 1);
  const hasFilter = period !== "" || status !== "" || model !== "" || keyId !== "";

  // Lantai rentang selalu statsDays plan; pilihan periode hanya
  // boleh mempersempit, tidak pernah melampaui rentang plan.
  // eslint-disable-next-line react-hooks/purity -- komponen server: waktu request dibaca saat render memang disengaja
  const floorSince = new Date(Date.now() - plan.statsDays * 86_400_000);
  const periodDef = PERIODS.find((p) => p.v === period);
  const since =
    periodDef && periodDef.v !== ""
      ? // eslint-disable-next-line react-hooks/purity -- sama seperti di atas
        new Date(Date.now() - periodDef.days * 86_400_000)
      : floorSince;

  const where = {
    userId: session.uid,
    createdAt: { gte: since },
    ...(status ? { status } : {}),
    ...(model ? { modelId: model } : {}),
    ...(keyId ? { apiKeyId: keyId } : {}),
  };

  const [total, successCount, tokenSum, catalog, keys] = await Promise.all([
    prisma.usageLog.count({ where }),
    prisma.usageLog.count({ where: { ...where, status: "SUCCESS" } }),
    prisma.usageLog.aggregate({ where, _sum: { totalTokens: true } }),
    prisma.modelCatalog.findMany({
      select: { modelId: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.apiKey.findMany({
      where: { userId: session.uid },
      select: { id: true, name: true, prefix: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const logs = await prisma.usageLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { apiKey: { select: { prefix: true, name: true } } },
  });

  const nameByModel = new Map(catalog.map((m) => [m.modelId, m.displayName]));
  const successPct = total > 0 ? Math.round((successCount / total) * 100) : null;

  const qs = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { periode: period, status, model, key: keyId, page: String(safePage), ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/app/logs?${s}` : "/app/logs";
  };

  const fmtDT = (d: Date) => d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const okPill = "bg-lime-400/10 text-lime-300";
  const badPill = "bg-red-500/15 text-red-300";
  const from = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, safePage * PAGE_SIZE);
  const navBtn = "inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm transition ";
  const stats = [
    { label: "Request", value: total.toLocaleString("id-ID"), icon: Activity },
    { label: "Token", value: (tokenSum._sum.totalTokens ?? 0).toLocaleString("id-ID"), icon: Coins },
    { label: "Sukses", value: successPct !== null ? `${successPct}%` : "-", icon: Gauge },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Riwayat"
        title="Log Pemakaian"
        actions={
          plan.id === "max" ? (
            <a
              href="/api/user/usage/export"
              className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-400/10 px-4 py-2 text-sm font-medium text-lime-200 transition hover:bg-lime-400/20"
            >
              <Download size={15} /> Ekspor CSV
            </a>
          ) : undefined
        }
      >
        <p>Semua request yang melewati gateway dengan key milikmu.</p>
        <p className="mt-1 text-zinc-500">
          Plan {plan.name} menampilkan log sampai {plan.statsDays} hari terakhir.
        </p>
      </PageHeader>

      {/* Ringkasan sesuai filter */}
      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${PANEL} min-w-0 p-3.5 sm:p-5`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-400 sm:text-[13px]">{c.label}</p>
                <Icon size={15} className="hidden text-lime-300/80 sm:block" />
              </div>
              <p className="mt-2 truncate text-xl font-extrabold tabular-nums tracking-tight sm:text-3xl" title={c.value}>
                {c.value}
              </p>
            </div>
          );
        })}
      </div>
      {hasFilter && <p className="mt-2 text-xs text-zinc-500">Angka di atas untuk filter yang sedang aktif.</p>}

      <form method="GET" action="/app/logs" className={`${PANEL} mt-4 p-4 sm:p-5`}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal size={15} className="text-lime-300" /> Saring Log
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-500">Periode</span>
            <select name="periode" defaultValue={period} className={selectCls(period !== "")} aria-label="Periode">
              {periodOptions.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-500">Model</span>
            <select name="model" defaultValue={model} className={selectCls(model !== "")} aria-label="Model">
              <option value="">Semua model</option>
              {catalog.map((m) => (
                <option key={m.modelId} value={m.modelId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-500">Key</span>
            <select name="key" defaultValue={keyId} className={selectCls(keyId !== "")} aria-label="Key">
              <option value="">Semua key</option>
              {keys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.prefix})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-zinc-500">Status</span>
            <select name="status" defaultValue={status} className={selectCls(status !== "")} aria-label="Status">
              <option value="">Semua status</option>
              <option value="SUCCESS">Sukses</option>
              <option value="ERROR">Error</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="submit"
            className="btn-shine rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
          >
            Terapkan
          </button>
          {hasFilter && (
            <Link
              href="/app/logs"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-200"
            >
              <RotateCcw size={14} /> Atur Ulang
            </Link>
          )}
        </div>
      </form>

      <div className={`${PANEL} mt-4 overflow-hidden`}>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <ScrollText size={20} />
            </span>
            <p className="mt-4 text-sm text-zinc-400">
              {hasFilter
                ? "Tidak ada request yang cocok dengan filter ini."
                : "Belum ada log. Request pertamamu akan tercatat di sini."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: kartu */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {logs.map((l) => (
                <li key={l.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100">{nameByModel.get(l.modelId) ?? l.modelId}</p>
                      <p className="truncate font-mono text-[11px] text-zinc-500">{l.modelId}</p>
                    </div>
                    <Pill className={l.status === "SUCCESS" ? okPill : badPill}>{l.status}</Pill>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {fmtDT(l.createdAt)}
                    {l.apiKey && (
                      <>
                        {" · "}
                        <span className="font-mono">{l.apiKey.prefix}</span> ({l.apiKey.name})
                      </>
                    )}
                  </p>
                  <dl className="mt-2.5 grid grid-cols-4 gap-2 text-xs">
                    {[
                      ["Prompt", l.promptTokens?.toLocaleString("id-ID") ?? "-"],
                      ["Completion", l.completionTokens?.toLocaleString("id-ID") ?? "-"],
                      ["Total", l.totalTokens?.toLocaleString("id-ID") ?? "-"],
                      ["Latency", l.latencyMs != null ? `${l.latencyMs} ms` : "-"],
                    ].map(([k, v]) => (
                      <div key={k} className="min-w-0 rounded-lg bg-white/[0.03] px-2 py-1.5">
                        <dt className="truncate text-[10px] text-zinc-500">{k}</dt>
                        <dd className={`mt-0.5 truncate tabular-nums ${k === "Total" ? "font-semibold text-zinc-100" : "text-zinc-300"}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>

            {/* Desktop: tabel */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 text-right font-medium">Prompt</th>
                    <th className="px-4 py-3 text-right font-medium">Completion</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Latency</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-white/[0.05] align-top transition hover:bg-white/[0.025]">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmtDT(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap font-medium text-zinc-200">{nameByModel.get(l.modelId) ?? l.modelId}</p>
                        <p className="font-mono text-[11px] text-zinc-500">{l.modelId}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {l.apiKey ? `${l.apiKey.prefix} (${l.apiKey.name})` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{l.promptTokens?.toLocaleString("id-ID") ?? "-"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{l.completionTokens?.toLocaleString("id-ID") ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
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

      {total > 0 && (
        <nav aria-label="Halaman log" className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
          <p className="text-zinc-400">
            <span className="font-semibold text-zinc-100">
              {from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")}
            </span>{" "}
            dari {total.toLocaleString("id-ID")} request
            <span className="text-zinc-600"> · </span>
            halaman {safePage} dari {pageCount}
          </p>
          <div className="flex items-center gap-1.5">
            {safePage > 1 ? (
              <Link href={qs({ page: String(safePage - 1) })} className={navBtn + "border-white/10 text-zinc-200 hover:border-lime-300/40 hover:text-lime-200"}>
                <ChevronLeft size={15} /> <span className="hidden sm:inline">Sebelumnya</span>
              </Link>
            ) : (
              <span className={navBtn + "border-white/[0.05] text-zinc-600"}>
                <ChevronLeft size={15} /> <span className="hidden sm:inline">Sebelumnya</span>
              </span>
            )}
            <div className="hidden items-center gap-1 sm:flex">
              {pageWindow(safePage, pageCount).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} className="px-1 text-zinc-600">…</span>
                ) : n === safePage ? (
                  <span key={n} aria-current="page" className="flex h-9 min-w-9 items-center justify-center rounded-full bg-lime-400 px-2 text-sm font-semibold text-zinc-950">
                    {n}
                  </span>
                ) : (
                  <Link key={n} href={qs({ page: String(n) })} className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-zinc-300 transition hover:bg-white/[0.06] hover:text-lime-200">
                    {n}
                  </Link>
                ),
              )}
            </div>
            {safePage < pageCount ? (
              <Link href={qs({ page: String(safePage + 1) })} className={navBtn + "border-white/10 text-zinc-200 hover:border-lime-300/40 hover:text-lime-200"}>
                <span className="hidden sm:inline">Berikutnya</span> <ChevronRight size={15} />
              </Link>
            ) : (
              <span className={navBtn + "border-white/[0.05] text-zinc-600"}>
                <span className="hidden sm:inline">Berikutnya</span> <ChevronRight size={15} />
              </span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
