import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal } from "lucide-react";

const PAGE_SIZE = 25;
const PERIODS = [
  { v: "semua", label: "Semua waktu" },
  { v: "24j", label: "24 jam terakhir" },
  { v: "7h", label: "7 hari terakhir" },
  { v: "30h", label: "30 hari terakhir" },
] as const;

const selectCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition focus:border-lime-300/60 sm:w-auto";

export default async function UserLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const periodRaw = pick("periode");
  const period = PERIODS.some((p) => p.v === periodRaw) ? periodRaw : "semua";
  const statusRaw = pick("status");
  const status = statusRaw === "SUCCESS" || statusRaw === "ERROR" ? statusRaw : "";
  const model = pick("model");
  const keyId = pick("key");
  const page = Math.max(1, parseInt(pick("page") || "1", 10) || 1);
  const hasFilter = period !== "semua" || status !== "" || model !== "" || keyId !== "";

  const since =
    period === "24j"
      ? new Date(Date.now() - 86_400_000)
      : period === "7h"
        ? new Date(Date.now() - 7 * 86_400_000)
        : period === "30h"
          ? new Date(Date.now() - 30 * 86_400_000)
          : null;

  const where = {
    userId: session.uid,
    ...(since ? { createdAt: { gte: since } } : {}),
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Log Pemakaian</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Semua request yang melewati gateway dengan key milikmu.
      </p>

      <form method="GET" action="/app/logs" className="glass mt-6 rounded-3xl p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal size={15} className="text-lime-300" /> Saring Log
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <select name="periode" defaultValue={period} className={selectCls} aria-label="Periode">
            {PERIODS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </select>
          <select name="model" defaultValue={model} className={selectCls} aria-label="Model">
            <option value="">Semua model</option>
            {catalog.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.displayName}
              </option>
            ))}
          </select>
          <select name="key" defaultValue={keyId} className={selectCls} aria-label="Key">
            <option value="">Semua key</option>
            {keys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.prefix})
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} className={selectCls} aria-label="Status">
            <option value="">Semua status</option>
            <option value="SUCCESS">Sukses</option>
            <option value="ERROR">Error</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
          >
            Terapkan
          </button>
          {hasFilter && (
            <Link
              href="/app/logs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
            >
              <RotateCcw size={14} /> Atur Ulang
            </Link>
          )}
        </div>
        <p className="mt-3.5 text-sm text-zinc-400">
          <span className="font-semibold text-zinc-100">{total.toLocaleString("id-ID")} request</span>
          {" · "}
          {(tokenSum._sum.totalTokens ?? 0).toLocaleString("id-ID")} token
          {successPct !== null && <>{" · "}{successPct}% sukses</>}
          {hasFilter && " untuk filter ini"}
        </p>
      </form>

      <div className="mt-5 overflow-x-auto glass rounded-3xl">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-white/[0.04] text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Prompt</th>
              <th className="px-4 py-3 font-medium">Completion</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Latency</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  {hasFilter
                    ? "Tidak ada request yang cocok dengan filter ini."
                    : "Belum ada log. Request pertamamu akan tercatat di sini."}
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-white/[0.05] align-top transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                  {l.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3">
                  <p className="whitespace-nowrap font-medium text-zinc-200">
                    {nameByModel.get(l.modelId) ?? l.modelId}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500">{l.modelId}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                  {l.apiKey ? `${l.apiKey.prefix} (${l.apiKey.name})` : "-"}
                </td>
                <td className="px-4 py-3">{l.promptTokens?.toLocaleString("id-ID") ?? "-"}</td>
                <td className="px-4 py-3">{l.completionTokens?.toLocaleString("id-ID") ?? "-"}</td>
                <td className="px-4 py-3 font-medium">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{l.latencyMs != null ? `${l.latencyMs} ms` : "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      l.status === "SUCCESS" ? "bg-lime-400/10 text-lime-300" : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {l.status}
                  </span>
                  {l.error && <p className="mt-1 max-w-56 text-xs break-words text-red-300/80">{l.error}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-zinc-400">
            Halaman <span className="font-semibold text-zinc-100">{safePage}</span> dari{" "}
            {pageCount}
          </p>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <Link
                href={qs({ page: String(safePage - 1) })}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.04]"
              >
                <ChevronLeft size={15} /> Sebelumnya
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.05] px-4 py-2 text-sm text-zinc-600">
                <ChevronLeft size={15} /> Sebelumnya
              </span>
            )}
            {safePage < pageCount ? (
              <Link
                href={qs({ page: String(safePage + 1) })}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.04]"
              >
                Berikutnya <ChevronRight size={15} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.05] px-4 py-2 text-sm text-zinc-600">
                Berikutnya <ChevronRight size={15} />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
