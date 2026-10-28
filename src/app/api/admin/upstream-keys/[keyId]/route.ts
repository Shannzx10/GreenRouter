import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";


type Ctx = { params: Promise<{ keyId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { keyId } = await params;
  let body: { status?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const data: {
    status?: "ACTIVE" | "DISABLED";
    cooldownUntil?: Date | null;
    failCount?: number;
    label?: string;
  } = {};
  if (body.status === "ACTIVE") {
    data.status = "ACTIVE";
    data.cooldownUntil = null;
    data.failCount = 0;
  } else if (body.status === "DISABLED") {
    data.status = "DISABLED";
    data.cooldownUntil = null;
  }
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  try {
    const key = await prisma.upstreamKey.update({
      where: { id: keyId },
      data,
      select: { id: true, label: true, keyHint: true, status: true, cooldownUntil: true, failCount: true },
    });
    return Response.json({ key });
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
  const { keyId } = await params;
  try {
    await prisma.upstreamKey.delete({ where: { id: keyId } });
    return Response.json({ ok: true });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
