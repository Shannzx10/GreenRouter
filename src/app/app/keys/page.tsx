import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { planById } from "@/lib/plans";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import UserKeysManager from "./UserKeysManager";

export default async function UserKeysPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const [keys, user] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: session.uid },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, isActive: true, tokenLimit: true, lastUsedAt: true, createdAt: true },
    }),
    prisma.user.findUnique({ where: { id: session.uid }, select: { plan: true } }),
  ]);
  const plan = planById(user?.plan ?? "gratis");
  const data = keys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));
  return (
    <div className="mx-auto w-full max-w-5xl">
      <UserKeysManager
        keys={data}
        planId={plan.id}
        planName={plan.name}
        apiKeyLimit={plan.apiKeyLimit}
      />
      <Link
        href="/app/docs"
        className="group mt-8 flex items-center gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 transition hover:border-lime-300/30 hover:bg-lime-400/[0.04]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
          <BookOpen size={17} />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-400">
          Butuh panduan pemakaian, contoh konfigurasi tool, atau daftar error? Semua ada di halaman{" "}
          <span className="font-medium text-lime-300">Dokumentasi</span>.
        </p>
        <ArrowUpRight size={18} className="shrink-0 text-zinc-500 transition group-hover:text-lime-300" />
      </Link>
    </div>
  );
}
