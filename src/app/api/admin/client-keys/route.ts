import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { generateClientKey } from "@/lib/crypto";


export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return Response.json({ keys });
}

// Buat key klien baru. Nilai penuh key hanya ditampilkan SATU KALI di respons ini.
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    },
    select: { id: true, name: true, prefix: true, isActive: true, createdAt: true },
  });
  return Response.json({ key, fullKey: full }, { status: 201 });
}
