import { connection } from "next/server";
import { prisma } from "@/lib/db";
import ClientKeysManager from "./ClientKeysManager";


export default async function ApiKeysPage() {
  await connection();
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  const data = keys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));
  return <ClientKeysManager keys={data} />;
}
