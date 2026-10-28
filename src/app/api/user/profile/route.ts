import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// User memperbarui data dirinya sendiri (saat ini: nama).
export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const user = await prisma.user.update({
    where: { id: s.uid },
    data: { name: name || null },
    select: { id: true, email: true, name: true, role: true, tokenLimit: true, createdAt: true },
  });
  return Response.json({ user });
}
