import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateClientKey } from "@/lib/crypto";

type Ctx = { params: Promise<{ id: string }> };

// Rotate: nilai rahasia key diganti baru di baris yang sama (nama, status,
// dan riwayat log tetap), nilai lama langsung berhenti bekerja.
export async function POST(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const own = await prisma.apiKey.findFirst({ where: { id, userId: s.uid } });
  if (!own) return Response.json({ error: "Key tidak ditemukan" }, { status: 404 });
  const { full, prefix, hash } = generateClientKey();
  const key = await prisma.apiKey.update({
    where: { id },
    data: { keyHash: hash, prefix, lastUsedAt: null },
    select: { id: true, name: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  return Response.json({ key, fullKey: full });
}
