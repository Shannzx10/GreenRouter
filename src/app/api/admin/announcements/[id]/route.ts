import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { title?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const title = (body.title ?? "").trim();
  const text = (body.body ?? "").trim();
  if (!title || !text) {
    return Response.json({ error: "Judul dan isi pengumuman wajib diisi" }, { status: 400 });
  }
  try {
    const announcement = await prisma.announcement.update({
      where: { id },
      data: { title, body: text },
    });
    return Response.json({ announcement });
  } catch (e) {
    return prismaErrorResponse(e) ?? Response.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await prisma.announcement.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return prismaErrorResponse(e) ?? Response.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
