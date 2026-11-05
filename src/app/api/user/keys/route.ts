import { prisma } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { generateClientKey } from "@/lib/crypto";
import { planById } from "@/lib/plans";
import { parseKeyTokenLimit } from "@/lib/key-limits";

// Key klien MILIK user yang sedang login saja.
export async function GET() {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await prisma.apiKey.findMany({
    where: { userId: s.uid },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, isActive: true, tokenLimit: true, lastUsedAt: true, createdAt: true },
  });
  return Response.json({ keys });
}

export async function POST(req: Request) {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name?: string; tokenLimit?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "Nama key wajib diisi" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { plan: true },
  });
  const plan = planById(user?.plan ?? "gratis");
  // Batas jumlah key per plan. Key yang sudah ada di atas batas
  // (mis. sesudah turun plan) tetap bisa dipakai; yang dibatasi
  // hanya pembuatan key baru sampai jumlahnya di bawah batas.
  const count = await prisma.apiKey.count({ where: { userId: s.uid } });
  if (count >= plan.apiKeyLimit) {
    return Response.json(
      {
        error: `Batas ${plan.apiKeyLimit} API key untuk plan ${plan.name} sudah tercapai. Hapus key lama atau naik plan untuk membuat key baru.`,
      },
      { status: 403 },
    );
  }
  const parsed = parseKeyTokenLimit(body.tokenLimit, plan.id);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { full, prefix, hash } = generateClientKey();
  const key = await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      prefix,
      userId: s.uid,
      tokenLimit: parsed.limit,
    },
    select: { id: true, name: true, prefix: true, isActive: true, tokenLimit: true, createdAt: true },
  });
  return Response.json({ key, fullKey: full }, { status: 201 });
}
