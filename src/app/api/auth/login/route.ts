import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signSession, verifyPassword } from "@/lib/crypto";
import { SESSION_COOKIE } from "@/lib/session";
import { describeProviders, providerSet } from "@/lib/oauth";

// Login untuk semua user. Frontend mengarahkan ADMIN ke /admin, USER ke /app.
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  // Akun OAuth yang belum menyetel password: beri tahu metode yang benar,
  // jangan sekadar "password salah".
  if (user && user.passwordHash.startsWith("oauth:")) {
    const methods = describeProviders(
      providerSet(user).filter((p) => p !== "password"),
    );
    return Response.json(
      {
        error: `Email ini terdaftar lewat ${methods} dan belum punya password. Silakan masuk dengan ${methods}, atau setel password dulu dari halaman Profil setelah masuk.`,
      },
      { status: 401 },
    );
  }
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "Email atau password salah" }, { status: 401 });
  }
  if (!user.isActive) {
    return Response.json(
      { error: "Akun dinonaktifkan. Hubungi admin." },
      { status: 403 },
    );
  }
  const token = signSession({ uid: user.id, email: user.email, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return Response.json({ ok: true, email: user.email, role: user.role });
}
