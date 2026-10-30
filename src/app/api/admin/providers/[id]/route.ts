import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";


type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: {
    name?: string;
    baseUrl?: string;
    isActive?: boolean;
    quotaKind?: string | null;
    quotaAmount?: string | null;
    quotaReset?: string | null;
    rateLimitNote?: string | null;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const data: {
    name?: string;
    baseUrl?: string;
    isActive?: boolean;
    quotaKind?: string | null;
    quotaAmount?: string | null;
    quotaReset?: string | null;
    rateLimitNote?: string | null;
    notes?: string | null;
  } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    data.baseUrl = body.baseUrl.trim().replace(/\/$/, "");
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  // Profil kapasitas halaman diagnosis: string kosong berarti kosongkan.
  for (const f of ["quotaKind", "quotaAmount", "quotaReset", "rateLimitNote", "notes"] as const) {
    if (typeof body[f] === "string") data[f] = body[f].trim() ? body[f].trim() : null;
  }
  try {
    const provider = await prisma.provider.update({ where: { id }, data });
    return Response.json({ provider });
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
  const { id } = await params;
  try {
    await prisma.provider.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
