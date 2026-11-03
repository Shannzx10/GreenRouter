import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";


export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const models = await prisma.modelCatalog.findMany({
    orderBy: { modelId: "asc" },
    include: {
      routes: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        include: { provider: { select: { id: true, name: true, isActive: true } } },
      },
    },
  });
  return Response.json({
    models: models.map((m) => ({
      id: m.id,
      modelId: m.modelId,
      displayName: m.displayName,
      earlyAccessUntil: m.earlyAccessUntil?.toISOString() ?? null,
      routes: m.routes.map((r) => ({
        id: r.id,
        providerId: r.providerId,
        providerName: r.provider.name,
        providerActive: r.provider.isActive,
        upstreamModelId: r.upstreamModelId,
        priority: r.priority,
        isActive: r.isActive,
      })),
    })),
  });
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { modelId?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const modelId = (body.modelId ?? "").trim();
  if (!modelId) return Response.json({ error: "modelId wajib diisi" }, { status: 400 });
  const existing = await prisma.modelCatalog.findUnique({ where: { modelId } });
  if (existing) return Response.json({ error: `Model '${modelId}' sudah ada` }, { status: 409 });
  try {
    const model = await prisma.modelCatalog.create({
      data: { modelId, displayName: (body.displayName ?? "").trim() || modelId },
    });
    return Response.json({ model }, { status: 201 });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
