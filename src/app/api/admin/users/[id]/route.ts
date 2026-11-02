import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let body: {
    name?: string | null;
    email?: string;
    role?: string;
    suspended?: boolean;
    suspendReason?: string | null;
    tokenLimit?: number | null;
    requestLimitHourly?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const isSelf = session.uid === id;
  const data: {
    name?: string | null;
    email?: string;
    role?: string;
    suspendedAt?: Date | null;
    suspendReason?: string | null;
    tokenLimit?: number | null;
    requestLimitHourly?: number | null;
  } = {};

  if (body.name !== undefined) data.name = (body.name ?? "").trim() || null;
  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    data.email = email;
  }
  if (body.role === "USER" || body.role === "ADMIN") {
    if (isSelf && body.role !== "ADMIN") {
      return Response.json(
        { error: "Kamu tidak bisa menurunkan role akunmu sendiri" },
        { status: 400 },
      );
    }
    data.role = body.role;
  }
  if (typeof body.suspended === "boolean") {
    if (isSelf && body.suspended) {
      return Response.json(
        { error: "Kamu tidak bisa mensuspend akunmu sendiri" },
        { status: 400 },
      );
    }
    if (body.suspended) {
      data.suspendedAt = new Date();
      data.suspendReason =
        typeof body.suspendReason === "string" && body.suspendReason.trim()
          ? body.suspendReason.trim().slice(0, 300)
          : null;
    } else {
      data.suspendedAt = null;
      data.suspendReason = null;
    }
  }
  if (body.tokenLimit !== undefined) {
    data.tokenLimit =
      typeof body.tokenLimit === "number" && body.tokenLimit > 0
        ? Math.floor(body.tokenLimit)
        : null;
  }
  if (body.requestLimitHourly !== undefined) {
    data.requestLimitHourly =
      typeof body.requestLimitHourly === "number" && body.requestLimitHourly > 0
        ? Math.floor(body.requestLimitHourly)
        : null;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, suspendedAt: true, suspendReason: true, tokenLimit: true, requestLimitHourly: true, createdAt: true },
    });
    return Response.json({ user });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) {
      return Response.json(
        { error: r.status === 409 ? "Email sudah dipakai user lain" : "Data tidak ditemukan" },
        { status: r.status },
      );
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (session.uid === id) {
    return Response.json(
      { error: "Kamu tidak bisa menghapus akunmu sendiri" },
      { status: 400 },
    );
  }
  try {
    // Key milik user dihapus dulu supaya langsung berhenti bekerja;
    // log pemakaian tetap tersimpan (key-nya menjadi null) sebagai riwayat.
    await prisma.apiKey.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    const r = prismaErrorResponse(e);
    if (r) return r;
    throw e;
  }
}
