import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

// Semua operasi di sini dibatasi kepemilikan: key user lain = 404.
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const own = await prisma.apiKey.findFirst({ where: { id, userId: s.uid } });
  if (!own) return Response.json({ error: "Key tidak ditemukan" }, { status: 404 });
  let body: { name?: string; isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const data: { name?: string; isActive?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  const key = await prisma.apiKey.update({
    where: { id },
    data,
    select: { id: true, name: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  return Response.json({ key });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const own = await prisma.apiKey.findFirst({ where: { id, userId: s.uid } });
  if (!own) return Response.json({ error: "Key tidak ditemukan" }, { status: 404 });
  await prisma.apiKey.delete({ where: { id } });
  return Response.json({ ok: true });
}
