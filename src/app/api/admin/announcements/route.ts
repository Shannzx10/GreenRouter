import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { prismaErrorResponse } from "@/lib/api-error";

export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ announcements });
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
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
    const announcement = await prisma.announcement.create({
      data: { title, body: text },
    });
    return Response.json({ announcement }, { status: 201 });
  } catch (e) {
    return prismaErrorResponse(e) ?? Response.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}
