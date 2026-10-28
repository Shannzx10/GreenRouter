import { connection } from "next/server";
import { prisma } from "@/lib/db";
import Reveal from "../../../Reveal";

export default async function LogsPage() {
  await connection();
  const logs = await prisma.usageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      provider: { select: { name: true } },
      apiKey: { select: { prefix: true, name: true } },
    },
  });

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
          Panel Admin
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Log Pemakaian</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          100 request terakhir yang melewati gateway, dari semua user dan key.
        </p>
      </Reveal>

      <Reveal>
        <div className="mt-8 overflow-x-auto glass rounded-3xl">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-white/[0.04] text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Waktu</th>
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium">Key Klien</th>
                <th className="px-4 py-2.5 font-medium">Prompt</th>
                <th className="px-4 py-2.5 font-medium">Completion</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Latency</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Belum ada log.</td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-white/[0.05] align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-zinc-400">
                    {l.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.modelId}</td>
                  <td className="px-4 py-2.5">{l.provider?.name ?? "-"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {l.apiKey ? `${l.apiKey.prefix} (${l.apiKey.name})` : "-"}
                  </td>
                  <td className="px-4 py-2.5">{l.promptTokens?.toLocaleString("id-ID") ?? "-"}</td>
                  <td className="px-4 py-2.5">{l.completionTokens?.toLocaleString("id-ID") ?? "-"}</td>
                  <td className="px-4 py-2.5">{l.totalTokens?.toLocaleString("id-ID") ?? "-"}</td>
                  <td className="px-4 py-2.5">{l.latencyMs != null ? `${l.latencyMs} ms` : "-"}</td>
                  <td className="px-4 py-2.5">
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
      </Reveal>
    </div>
  );
}
