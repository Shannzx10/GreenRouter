import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "../ui";
import CatalogExplorer, { type CatalogModel } from "./CatalogExplorer";

function parseCsv(v: string | null): string[] {
  return v
    ? v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
}

export default async function UserModelsPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const models = await prisma.modelCatalog.findMany({ orderBy: { displayName: "asc" } });
  const routes = await prisma.modelRoute.findMany({
    where: { isActive: true },
    select: { modelId: true },
  });
  const routed = new Set(routes.map((r) => r.modelId));
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { plan: true },
  });
  const now = new Date();

  const data: CatalogModel[] = models.map((m) => ({
    id: m.id,
    modelId: m.modelId,
    displayName: m.displayName,
    active: routed.has(m.id),
    earlyAccess: !!m.earlyAccessUntil && m.earlyAccessUntil > now,
    contextTokens: m.contextTokens,
    maxOutputTokens: m.maxOutputTokens,
    knowledgeCutoff: m.knowledgeCutoff,
    modalities: parseCsv(m.inputModalities),
    capabilities: parseCsv(m.capabilities),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Gateway"
        title="Katalog Model"
        actions={
          <Link
            href="/app/performa"
            className="inline-flex items-center gap-1 text-sm font-medium text-lime-300 transition hover:text-lime-200"
          >
            Lihat Performa <ArrowUpRight size={15} />
          </Link>
        }
      >
        <p>Model yang bisa kamu pakai lewat gateway, lengkap dengan konteks dan kemampuannya.</p>
      </PageHeader>

      <div className="mt-6">
        <CatalogExplorer models={data} viewerPlan={user?.plan ?? "gratis"} />
      </div>
    </div>
  );
}
