import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";


export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      upstreamKeys: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          keyHint: true,
          status: true,
          cooldownUntil: true,
          failCount: true,
          createdAt: true,
        },
      },
      _count: { select: { routes: true } },
    },
  });
  return Response.json({
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      isActive: p.isActive,
      routeCount: p._count.routes,
      keys: p.upstreamKeys,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; baseUrl?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const baseUrl = (body.baseUrl ?? "").trim().replace(/\/$/, "");
  if (!name || !baseUrl) {
    return Response.json({ error: "Nama dan baseUrl wajib diisi" }, { status: 400 });
  }
  try {
    new URL(baseUrl);
  } catch {
    return Response.json({ error: "baseUrl bukan URL yang valid" }, { status: 400 });
  }
  const existing = await prisma.provider.findUnique({ where: { name } });
  if (existing) {
    return Response.json({ error: `Provider '${name}' sudah ada` }, { status: 409 });
  }
  try {
    const provider = await prisma.provider.create({ data: { name, baseUrl } });
    return Response.json({ provider }, { status: 201 });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
