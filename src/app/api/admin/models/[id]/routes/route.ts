import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { providerId?: string; upstreamModelId?: string; priority?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const providerId = (body.providerId ?? "").trim();
  if (!providerId) return Response.json({ error: "providerId wajib diisi" }, { status: 400 });
  const model = await prisma.modelCatalog.findUnique({ where: { id } });
  if (!model) return Response.json({ error: "Model tidak ditemukan" }, { status: 404 });
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return Response.json({ error: "Provider tidak ditemukan" }, { status: 404 });

  // Satu model hanya boleh punya SATU route per provider.
  const existing = await prisma.modelRoute.findFirst({
    where: { modelId: id, providerId },
  });
  if (existing) {
    return Response.json(
      {
        error: `Route ke provider ${provider.name} sudah ada untuk model ini. Satu model hanya bisa punya satu route per provider — hapus route lama dulu bila ingin mengganti.`,
      },
      { status: 409 },
    );
  }

  try {
    const route = await prisma.modelRoute.create({
      data: {
        modelId: id,
        providerId,
        upstreamModelId: (body.upstreamModelId ?? "").trim() || model.modelId,
        priority: typeof body.priority === "number" ? body.priority : 0,
      },
    });
    return Response.json({ route }, { status: 201 });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
