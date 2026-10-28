import { connection } from "next/server";
import { prisma } from "@/lib/db";
import ModelsManager from "./ModelsManager";


export default async function ModelsPage() {
  await connection();
  const [models, providers] = await Promise.all([
    prisma.modelCatalog.findMany({
      orderBy: { modelId: "asc" },
      include: {
        routes: {
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          include: { provider: { select: { id: true, name: true, isActive: true } } },
        },
      },
    }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const data = models.map((m) => ({
    id: m.id,
    modelId: m.modelId,
    displayName: m.displayName,
    contextTokens: m.contextTokens,
    maxOutputTokens: m.maxOutputTokens,
    inputModalities: m.inputModalities,
    capabilities: m.capabilities,
    knowledgeCutoff: m.knowledgeCutoff,
    routes: m.routes.map((r) => ({
      id: r.id,
      providerId: r.providerId,
      providerName: r.provider.name,
      providerActive: r.provider.isActive,
      upstreamModelId: r.upstreamModelId,
      priority: r.priority,
      isActive: r.isActive,
    })),
  }));
  return <ModelsManager models={data} providers={providers} />;
}
