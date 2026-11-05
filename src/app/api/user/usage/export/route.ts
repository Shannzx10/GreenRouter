import { prisma } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { planById } from "@/lib/plans";

// Ekspor log pemakaian ke CSV, khusus plan Max (bagian dari
// benefit statistik 90 hari yang bisa diekspor). Rentang ekspor
// mengikuti statsDays plan Max; jumlah baris dibatasi supaya
// berkas tetap wajar diunduh.
const MAX_ROWS = 10_000;

function csvField(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { plan: true },
  });
  const plan = planById(user?.plan ?? "gratis");
  if (plan.id !== "max") {
    return Response.json(
      { error: "Ekspor log hanya tersedia di plan Max" },
      { status: 403 },
    );
  }
  const since = new Date(Date.now() - plan.statsDays * 86_400_000);
  const logs = await prisma.usageLog.findMany({
    where: { userId: s.uid, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { apiKey: { select: { prefix: true, name: true } } },
  });
  const header =
    "waktu,model,key,prompt_tokens,completion_tokens,total_tokens,latency_ms,status";
  const lines = logs.map((l) =>
    [
      csvField(l.createdAt.toISOString()),
      csvField(l.modelId),
      csvField(l.apiKey ? `${l.apiKey.prefix} (${l.apiKey.name})` : ""),
      csvField(l.promptTokens),
      csvField(l.completionTokens),
      csvField(l.totalTokens),
      csvField(l.latencyMs),
      csvField(l.status),
    ].join(","),
  );
  const csv = [header, ...lines].join("\n");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="greenrouter-log-${stamp}.csv"`,
    },
  });
}
