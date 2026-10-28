import { connection } from "next/server";
import { prisma } from "@/lib/db";
import ProvidersManager from "./ProvidersManager";


export default async function ProvidersPage() {
  await connection();
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      upstreamKeys: {
        orderBy: { createdAt: "asc" },
        include: {
          cooldowns: {
            where: { until: { gt: new Date() } },
            orderBy: { until: "asc" },
          },
        },
      },
      _count: { select: { routes: true } },
    },
  });
  const data = providers.map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    isActive: p.isActive,
    routeCount: p._count.routes,
    keys: p.upstreamKeys.map((k) => ({
      id: k.id,
      label: k.label,
      keyHint: k.keyHint,
      status: k.status as string,
      cooldownUntil: k.cooldownUntil?.toISOString() ?? null,
      failCount: k.failCount,
      createdAt: k.createdAt.toISOString(),
      rateLimits: k.cooldowns.map((c) => ({
        modelId: c.modelId,
        until: c.until.toISOString(),
      })),
    })),
  }));
  return <ProvidersManager providers={data} />;
}
