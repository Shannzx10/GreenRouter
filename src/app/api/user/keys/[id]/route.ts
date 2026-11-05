import { prisma } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { parseKeyTokenLimit } from "@/lib/key-limits";

type Ctx = { params: Promise<{ id: string }> };

// Semua operasi di sini dibatasi kepemilikan: key user lain = 404.
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const own = await prisma.apiKey.findFirst({ where: { id, userId: s.uid } });
  if (!own) return Response.json({ error: "Key tidak ditemukan" }, { status: 404 });
  let body: { name?: string; isActive?: boolean; tokenLimit?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const data: { name?: string; isActive?: boolean; tokenLimit?: number | null } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.tokenLimit !== undefined) {
    const user = await prisma.user.findUnique({
      where: { id: s.uid },
      select: { plan: true },
    });
    const parsed = parseKeyTokenLimit(body.tokenLimit, user?.plan ?? "gratis");
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    data.tokenLimit = parsed.limit;
  }
  const key = await prisma.apiKey.update({
    where: { id },
    data,
    select: { id: true, name: true, prefix: true, isActive: true, tokenLimit: true, lastUsedAt: true, createdAt: true },
  });
  return Response.json({ key });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const own = await prisma.apiKey.findFirst({ where: { id, userId: s.uid } });
  if (!own) return Response.json({ error: "Key tidak ditemukan" }, { status: 404 });
  await prisma.apiKey.delete({ where: { id } });
  return Response.json({ ok: true });
}
