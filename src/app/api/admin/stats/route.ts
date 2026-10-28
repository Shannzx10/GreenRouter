import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";


export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [providers, upstreamKeys, models, clientKeys, requestsToday, tokensToday, recentLogs] =
    await Promise.all([
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
    ]);

  return Response.json({
    providers,
    upstreamKeys,
    models,
    clientKeys,
    requestsToday,
    tokensToday: tokensToday._sum.totalTokens ?? 0,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      modelId: l.modelId,
      provider: l.provider?.name ?? "-",
      apiKeyPrefix: l.apiKey?.prefix ?? "-",
      status: l.status,
      totalTokens: l.totalTokens,
      latencyMs: l.latencyMs,
      createdAt: l.createdAt,
    })),
  });
}
