import { prisma } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/crypto";

// Ganti password sendiri: wajib tahu password saat ini.
export async function POST(req: Request) {
  const s = await getActiveSession();
  if (!s) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const current = body.currentPassword ?? "";
  const next = body.newPassword ?? "";
  if (next.length < 8) {
    return Response.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user) {
    return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
  // Akun yang lahir dari OAuth boleh menyetel password pertamanya di sini
  // (tanpa password lama) agar selanjutnya bisa login email+password juga.
  // Akun yang sudah berpassword wajib verifikasi password saat ini.
  const isOAuthOnly = user.passwordHash.startsWith("oauth:");
  if (!isOAuthOnly && !verifyPassword(current, user.passwordHash)) {
    return Response.json({ error: "Password saat ini salah" }, { status: 400 });
  }
  // Setelah password terpasang, "password" resmi jadi salah satu metode masuknya.
  const set = user.authProviders
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!set.includes("password")) set.push("password");
  await prisma.user.update({
    where: { id: s.uid },
    data: { passwordHash: hashPassword(next), authProviders: set.join(",") },
  });
  return Response.json({ ok: true });
}
