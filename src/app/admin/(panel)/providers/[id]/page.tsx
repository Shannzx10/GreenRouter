import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { providerGuide } from "@/server/provider-guides";
import ProviderDiagnosis from "./ProviderDiagnosis";

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      upstreamKeys: { orderBy: { createdAt: "asc" } },
      routes: {
        where: { isActive: true },
        include: { model: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!provider) notFound();

  const recentErrors = await prisma.usageLog.findMany({
    where: { providerId: id, status: "ERROR" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { modelId: true, error: true, createdAt: true, upstreamKeyId: true },
  });
  const lastErrorByKey: Record<string, { error: string; at: string }> = {};
  for (const l of recentErrors) {
    if (l.upstreamKeyId && !lastErrorByKey[l.upstreamKeyId]) {
      lastErrorByKey[l.upstreamKeyId] = {
        error: (l.error ?? "").slice(0, 200),
        at: l.createdAt.toISOString(),
      };
    }
  }

  const health: {
    modelId: string;
    status: string;
    latencyMs: number;
    error: string | null;
    checkedAt: string;
  }[] = [];
  for (const r of provider.routes) {
    const h = await prisma.modelHealthCheck.findFirst({
      where: { modelId: r.model.modelId },
      orderBy: { checkedAt: "desc" },
    });
    if (h) {
      health.push({
        modelId: r.model.modelId,
        status: h.status,
        latencyMs: h.latencyMs,
        error: h.error,
        checkedAt: h.checkedAt.toISOString(),
      });
    }
  }

  return (
    <ProviderDiagnosis
      provider={{
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
        supportsAnthropic: provider.supportsAnthropic,
        quotaCheckUrl: provider.quotaCheckUrl,
        quotaKind: provider.quotaKind ?? "",
        quotaAmount: provider.quotaAmount ?? "",
        quotaReset: provider.quotaReset ?? "",
        rateLimitNote: provider.rateLimitNote ?? "",
        notes: provider.notes ?? "",
      }}
      keys={provider.upstreamKeys.map((k) => ({
        id: k.id,
        label: k.label,
        keyHint: k.keyHint,
        status: k.status as string,
        cooldownUntil: k.cooldownUntil?.toISOString() ?? null,
        failCount: k.failCount,
        createdAt: k.createdAt.toISOString(),
      }))}
      routes={provider.routes.map((r) => ({
        id: r.id,
        modelId: r.model.modelId,
        displayName: r.model.displayName,
        upstreamModelId: r.upstreamModelId,
      }))}
      lastErrors={recentErrors.slice(0, 12).map((l) => ({
        modelId: l.modelId,
        error: (l.error ?? "").slice(0, 200),
        at: l.createdAt.toISOString(),
      }))}
      lastErrorByKey={lastErrorByKey}
      health={health}
      guide={providerGuide(provider.name)}
    />
  );
}
