import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { planById } from "@/lib/plans";
import Link from "next/link";
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
    <>
      <UserKeysManager
        keys={data}
        planId={plan.id}
        planName={plan.name}
        apiKeyLimit={plan.apiKeyLimit}
      />
      <p className="mt-10 text-sm text-zinc-500">
        Butuh panduan pemakaian, contoh konfigurasi tool, atau daftar error? Semua ada di halaman{" "}
        <Link href="/app/docs" className="font-medium text-lime-300 hover:text-lime-200">
          Dokumentasi
        </Link>
        .
      </p>
    </>
  );
}
