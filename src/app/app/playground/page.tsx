import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { cycleTokensUsed } from "@/lib/quota";
import { PageHeader } from "../ui";
import Reveal from "../../Reveal";
import PlaygroundChat, { type PlaygroundModel } from "./PlaygroundChat";

// Playground: coba model langsung dari dashboard memakai sesi login.
// Daftar model meniru Katalog Model: hanya model katalog aktif yang
// punya rute aktif; model masa akses awal terkunci untuk plan Gratis.
export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  await connection();
  const session = await getSession();
  const plan = session?.plan ?? "gratis";
  const { model: wanted } = await searchParams;
  const now = new Date();

  const [catalog, routes, user] = await Promise.all([
    prisma.modelCatalog.findMany({ orderBy: { displayName: "asc" } }),
    prisma.modelRoute.findMany({
      where: { isActive: true, provider: { isActive: true } },
      select: { modelId: true },
    }),
    session
      ? prisma.user.findUnique({
          where: { id: session.uid },
          select: { createdAt: true, tokenLimit: true },
        })
      : Promise.resolve(null),
  ]);

  const routed = new Set(routes.map((r) => r.modelId));
  const models: PlaygroundModel[] = catalog
    .filter((m) => routed.has(m.id))
    .map((m) => {
      const earlyAccess = !!(m.earlyAccessUntil && m.earlyAccessUntil > now);
      return {
        modelId: m.modelId,
        displayName: m.displayName,
        contextTokens: m.contextTokens,
        maxOutputTokens: m.maxOutputTokens,
        earlyAccess,
        locked: earlyAccess && plan === "gratis",
      };
    });

  const initial =
    models.find((m) => m.modelId === wanted && !m.locked) ?? models.find((m) => !m.locked);

  let quota: { used: number; limit: number } | null = null;
  if (session && user && user.tokenLimit != null) {
    const { used } = await cycleTokensUsed(session.uid, user.createdAt);
    quota = { used, limit: user.tokenLimit };
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Reveal>
        <PageHeader eyebrow="Uji Coba" title="Playground">
          <p>
            Coba model langsung dari dashboard, tanpa perlu API key. Pemakaian tercatat di log dan
            memotong kuota akunmu seperti request API biasa.
          </p>
        </PageHeader>
      </Reveal>

      <Reveal delay={80} className="mt-6">
        {initial ? (
          <PlaygroundChat models={models} initialModelId={initial.modelId} quota={quota} />
        ) : (
          <div className="glass rounded-3xl px-6 py-14 text-center">
            <p className="text-sm text-zinc-400">Belum ada model yang tersedia untuk dicoba saat ini.</p>
          </div>
        )}
      </Reveal>
    </div>
  );
}
