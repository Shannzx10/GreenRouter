import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";


type Ctx = { params: Promise<{ routeId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { routeId } = await params;
  let body: { priority?: number; isActive?: boolean; upstreamModelId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const data: { priority?: number; isActive?: boolean; upstreamModelId?: string } = {};
  if (typeof body.priority === "number") data.priority = body.priority;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.upstreamModelId === "string" && body.upstreamModelId.trim()) {
    data.upstreamModelId = body.upstreamModelId.trim();
  }
  try {
    const route = await prisma.modelRoute.update({ where: { id: routeId }, data });
    return Response.json({ route });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { routeId } = await params;
  try {
    await prisma.modelRoute.delete({ where: { id: routeId } });
    return Response.json({ ok: true });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
