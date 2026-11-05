import { connection } from "next/server";
import { prisma } from "@/lib/db";
import Reveal from "../../../Reveal";
import { PageHeader, PANEL, Pill } from "../../../app/ui";

export default async function LogsPage() {
  await connection();
  // Kolom error mentah dari hulu sengaja TIDAK diambil: halaman ini hanya
  // menampilkan pil status, sama seperti halaman log user.
  const logs = await prisma.usageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      modelId: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      latencyMs: true,
      status: true,
      provider: { select: { name: true } },
      apiKey: { select: { prefix: true, name: true } },
    },
  });

  const fmtDT = (d: Date) => d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const okPill = "bg-lime-400/10 text-lime-300";
  const badPill = "bg-red-500/15 text-red-300";
  const okCount = logs.filter((x) => x.status === "SUCCESS").length;

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Panel Admin" title="Log Pemakaian">
        <p>100 request terakhir yang melewati gateway, dari semua user dan key.</p>
      </PageHeader>

      {logs.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 font-mono text-xs">
          <Pill className="border border-white/10 bg-white/[0.03] px-3 py-1.5 text-zinc-300">{logs.length} request</Pill>
          <Pill className={`border border-lime-300/20 px-3 py-1.5 ${okPill}`}>{okCount} sukses</Pill>
          {logs.length - okCount > 0 && (
            <Pill className={`border border-red-400/20 px-3 py-1.5 ${badPill}`}>{logs.length - okCount} gagal</Pill>
          )}
        </div>
      )}

      <Reveal>
        <div className={`${PANEL} mt-4 overflow-hidden`}>
          {logs.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">Belum ada log.</p>
          ) : (
            <>
              <ul className="divide-y divide-white/[0.06] md:hidden">
                {logs.map((l) => (
                  <li key={l.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-mono text-xs text-zinc-200">{l.modelId}</p>
                      <Pill className={l.status === "SUCCESS" ? okPill : badPill}>{l.status}</Pill>
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {fmtDT(l.createdAt)} · {l.provider?.name ?? "-"}
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
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Waktu</th>
                      <th className="px-4 py-3 font-medium">Model</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Key Klien</th>
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
                        <td className="px-4 py-3 font-mono text-xs">{l.modelId}</td>
                        <td className="px-4 py-3">{l.provider?.name ?? "-"}</td>
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
      </Reveal>
    </div>
  );
}
