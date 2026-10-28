import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { encryptSecret, keyHint } from "@/lib/crypto";


type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { label?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const key = (body.key ?? "").trim();
  if (!key) return Response.json({ error: "API key wajib diisi" }, { status: 400 });
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) return Response.json({ error: "Provider tidak ditemukan" }, { status: 404 });

  const count = await prisma.upstreamKey.count({ where: { providerId: id } });
  const created = await prisma.upstreamKey.create({
    data: {
      providerId: id,
      label: (body.label ?? "").trim() || `${provider.name} #${count + 1}`,
      encryptedKey: encryptSecret(key),
      keyHint: keyHint(key),
    },
    select: { id: true, label: true, keyHint: true, status: true, createdAt: true },
  });
  return Response.json({ key: created }, { status: 201 });
}
