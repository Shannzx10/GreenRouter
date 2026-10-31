import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import ModelsManager from "./ModelsManager";

export default async function ModelsPage() {
  await connection();
  const [models, routerProvider] = await Promise.all([
    prisma.modelCatalog.findMany({
      orderBy: { modelId: "asc" },
      include: {
        routes: { orderBy: [{ priority: "asc" }, { createdAt: "asc" }] },
      },
    }),
    prisma.provider.findUnique({
      where: { name: "9Router" },
      include: { upstreamKeys: { take: 1 } },
    }),
  ]);

  // Daftar model yang tersedia di 9Router untuk pemilih sasaran. Nilai penuh
  // (dengan awalan) hanya dipakai sebagai data; label tampil tanpa awalan.
  // Daftar mentah 9Router juga memuat model dari provider tanpa koneksi yang
  // tidak pernah dipakai GreenRouter (roster gratisan yang berganti-ganti),
  // jadi pemilih hanya menampilkan model yang awalannya benar-benar terpakai
  // oleh salah satu sasaran katalog saat ini.
  const usedPrefixes = new Set(
    models.flatMap((m) => m.routes.map((r) => r.upstreamModelId.split("/")[0])),
  );
  let routerModels: string[] = [];
  if (routerProvider?.upstreamKeys[0]) {
    try {
      const res = await fetch("http://127.0.0.1:20128/v1/models", {
        headers: { authorization: "Bearer ".concat(decryptSecret(routerProvider.upstreamKeys[0].encryptedKey)) },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const j = (await res.json()) as { data?: { id: string }[] };
        routerModels = (j.data ?? [])
          .map((m) => m.id)
          .filter((id) => usedPrefixes.has(id.split("/")[0]));
      }
    } catch {}
  }

  const data = models.map((m) => {
    const route = m.routes.find((r) => r.providerId === routerProvider?.id) ?? m.routes[0];
    return {
      id: m.id,
      modelId: m.modelId,
      displayName: m.displayName,
      contextTokens: m.contextTokens,
      maxOutputTokens: m.maxOutputTokens,
      inputModalities: m.inputModalities,
      capabilities: m.capabilities,
      knowledgeCutoff: m.knowledgeCutoff,
      routeId: route?.id ?? null,
      target: route?.upstreamModelId ?? null,
    };
  });
  return (
    <ModelsManager
      models={data}
      routerProviderId={routerProvider?.id ?? null}
      routerModels={routerModels}
      routerOk={routerModels.length > 0}
    />
  );
}
