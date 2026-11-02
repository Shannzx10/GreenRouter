import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { cycleTokensUsed } from "@/lib/quota";
import UsersManager from "./UsersManager";

export default async function AdminUsersPage() {
  await connection();
  const session = await getAdminSession();
  if (!session) return null;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { apiKeys: true } } },
  });

  // Pemakaian dihitung per siklus 7 hari masing-masing user (jangkar createdAt).
  const usedList = await Promise.all(
    users.map((u) => cycleTokensUsed(u.id, u.createdAt).then((r) => r.used)),
  );

  const data = users.map((u, i) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    authProviders: u.authProviders,
    role: u.role,
    suspendedAt: u.suspendedAt?.toISOString() ?? null,
    suspendReason: u.suspendReason,
    tokenLimit: u.tokenLimit,
    requestLimitHourly: u.requestLimitHourly,
    keyCount: u._count.apiKeys,
    usedThisCycle: usedList[i] ?? 0,
    createdAt: u.createdAt.toISOString(),
    isSelf: u.id === session.uid,
  }));

  return <UsersManager users={data} />;
}
