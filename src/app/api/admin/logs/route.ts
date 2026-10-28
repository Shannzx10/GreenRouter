import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";


export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const logs = await prisma.usageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      provider: { select: { name: true } },
      apiKey: { select: { prefix: true, name: true } },
    },
  });
  return Response.json({
    logs: logs.map((l) => ({
      id: l.id,
      modelId: l.modelId,
      provider: l.provider?.name ?? "-",
      apiKey: l.apiKey ? `${l.apiKey.prefix} (${l.apiKey.name})` : "-",
      promptTokens: l.promptTokens,
      completionTokens: l.completionTokens,
      totalTokens: l.totalTokens,
      latencyMs: l.latencyMs,
      status: l.status,
      error: l.error,
      createdAt: l.createdAt,
    })),
  });
}
