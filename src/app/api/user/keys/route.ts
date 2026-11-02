import { prisma } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { generateClientKey } from "@/lib/crypto";

// Key klien MILIK user yang sedang login saja.
export async function GET() {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await prisma.apiKey.findMany({
    where: { userId: s.uid },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  return Response.json({ keys });
}

export async function POST(req: Request) {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "Nama key wajib diisi" }, { status: 400 });
  }
  const { full, prefix, hash } = generateClientKey();
  const key = await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      prefix,
      userId: s.uid,
    },
    select: { id: true, name: true, prefix: true, isActive: true, createdAt: true },
  });
  return Response.json({ key, fullKey: full }, { status: 201 });
}
